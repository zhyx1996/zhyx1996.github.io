(function() {
    'use strict';

    const W = 50, H = 24;
    const MAP_W = 80, MAP_H = 25;

    const MONSTERS = [
        { ch: 'r', name: 'rat',       color: '#A0522D', hp: 3,  atk: 1, xp: 5  },
        { ch: 'k', name: 'kobold',    color: '#228B22', hp: 5,  atk: 2, xp: 10 },
        { ch: 'g', name: 'goblin',    color: '#32CD32', hp: 8,  atk: 3, xp: 15 },
        { ch: 'o', name: 'orc',       color: '#006400', hp: 12, atk: 4, xp: 25 },
        { ch: 'T', name: 'troll',     color: '#8B4513', hp: 20, atk: 6, xp: 50 },
        { ch: 'S', name: 'snake',     color: '#9ACD32', hp: 4,  atk: 2, xp: 8  },
        { ch: 'B', name: 'bat',       color: '#4B0082', hp: 2,  atk: 1, xp: 3  },
        { ch: 'W', name: 'worm',      color: '#FF69B4', hp: 6,  atk: 2, xp: 12 },
    ];

    const ITEMS = [
        { ch: '!', name: 'healing potion', color: '#FF4444', type: 'potion', heal: 10 },
        { ch: '?', name: 'scroll',         color: '#DDDDDD', type: 'scroll' },
        { ch: '$', name: 'gold',           color: '#FFD700', type: 'gold', min: 5, max: 20 },
        { ch: ')', name: 'short sword',    color: '#CCCCCC', type: 'weapon', atk: 3 },
        { ch: '[', name: 'leather armor',  color: '#8B4513', type: 'armor', def: 2 },
        { ch: '%', name: 'food ration',    color: '#DEB887', type: 'food', heal: 5 },
        { ch: '/', name: 'wand',           color: '#9370DB', type: 'wand' },
    ];

    let display, map, explored, fov, scheduler, engine;
    let player, monsters, items, log, gameOver, level, maxLevel;
    let keyHandler;

    function init(container) {
        display = new ROT.Display({ width: MAP_W, height: MAP_H, fontSize: 14, fontFamily: 'JetBrains Mono, monospace', fg: '#ccc', bg: '#0a0a0a' });
        container.appendChild(display.getContainer());

        scheduler = new ROT.Scheduler.Simple();
        gameOver = false;
        level = 1;
        maxLevel = 1;
        log = [];

        startGame();
        drawAll();
        renderStatus();
        renderLog();
    }

    function startGame() {
        player = { x: 0, y: 0, hp: 30, maxHp: 30, atk: 2, def: 0, xp: 0, level: 1, gold: 0, weapon: null, armor: null };
        monsters = [];
        items = [];
        explored = {};
        fov = new ROT.FOV.PreciseShadowcasting(lightPasses);

        generateMap();
        placeEntities();
        updateFOV();

        scheduler.add(player, true);
        for (const m of monsters) scheduler.add(m, true);
        engine = new ROT.Engine(scheduler);
        engine.start();

        bindKeys();
        addLog('Welcome to the dungeon! Find the > stairs to descend.');
        addLog('Arrow keys / WASD to move, > to descend stairs, R to restart.');
    }

    function lightPasses(x, y) {
        return map && map[x + ',' + y] !== 1;
    }

    function generateMap() {
        map = {};
        const builder = new ROT.Map.Dungeon(MAP_W, MAP_H);
        builder.create(function(x, y, v) {
            map[x + ',' + y] = v;
        });

        const rooms = builder.getRooms();
        for (const room of rooms) {
            const doors = room.getDoors(function(x, y) {
                map[x + ',' + y] = 2;
            });
        }

        const rooms2 = builder.getRooms();
        for (let i = 0; i < rooms2.length; i++) {
            const r = rooms2[i];
            if (i === 0) {
                const c = r.getCenter();
                player.x = c[0];
                player.y = c[1];
            } else if (i === rooms2.length - 1) {
                const c = r.getCenter();
                map[c[0] + ',' + c[1]] = 3;
            }
        }
    }

    function placeEntities() {
        const rooms = getAllRooms();

        const numMobs = 4 + level * 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numMobs; i++) {
            const room = rooms[Math.floor(Math.random() * rooms.length)];
            const x = room.getLeft() + 1 + Math.floor(Math.random() * (room.getRight() - room.getLeft() - 1));
            const y = room.getTop() + 1 + Math.floor(Math.random() * (room.getBottom() - room.getTop() - 1));
            if (map[x + ',' + y] === 0 && !monsterAt(x, y) && !(x === player.x && y === player.y)) {
                const type = MONSTERS[Math.min(Math.floor(Math.random() * (1 + level)), MONSTERS.length - 1)];
                const mob = { x, y, ...type, maxHp: type.hp, _type: 'monster' };
                monsters.push(mob);
            }
        }

        const numItems = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numItems; i++) {
            const room = rooms[Math.floor(Math.random() * rooms.length)];
            const x = room.getLeft() + 1 + Math.floor(Math.random() * (room.getRight() - room.getLeft() - 1));
            const y = room.getTop() + 1 + Math.floor(Math.random() * (room.getBottom() - room.getTop() - 1));
            if (map[x + ',' + y] === 0 && !itemAt(x, y)) {
                const type = ITEMS[Math.floor(Math.random() * ITEMS.length)];
                items.push({ x, y, ...type });
            }
        }
    }

    function getAllRooms() {
        const builder = new ROT.Map.Dungeon(MAP_W, MAP_H);
        const tempMap = {};
        builder.create(function(x, y, v) { tempMap[x + ',' + y] = v; });
        return builder.getRooms();
    }

    function monsterAt(x, y) {
        return monsters.find(m => m.x === x && m.y === y);
    }

    function itemAt(x, y) {
        return items.find(i => i.x === x && i.y === y);
    }

    function updateFOV() {
        for (const key in explored) explored[key] = false;
        fov.compute(player.x, player.y, 8, function(x, y, r, vis) {
            explored[x + ',' + y] = true;
        });
    }

    function drawAll() {
        display.clear();
        for (const key in explored) {
            const [x, y] = key.split(',').map(Number);
            if (!explored[key]) {
                if (map[key] === 1) display.draw(x, y, '#', '#333', '#111');
                else display.draw(x, y, '.', '#222', '#111');
            } else {
                if (map[key] === 1) display.draw(x, y, '#', '#888', '#1a1a1a');
                else if (map[key] === 0) display.draw(x, y, '.', '#555', '#1a1a1a');
                else if (map[key] === 2) display.draw(x, y, '+', '#8B4513', '#1a1a1a');
                else if (map[key] === 3) display.draw(x, y, '>', '#FFD700', '#1a1a1a');
            }
        }

        for (const item of items) {
            if (explored[item.x + ',' + item.y]) {
                display.draw(item.x, item.y, item.ch, item.color);
            }
        }

        for (const m of monsters) {
            if (explored[m.x + ',' + m.y]) {
                display.draw(m.x, m.y, m.ch, m.color);
            }
        }

        display.draw(player.x, player.y, '@', '#FFD700');
    }

    function bindKeys() {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = function(e) {
            if (gameOver) {
                if (e.key === 'r' || e.key === 'R') {
                    restart();
                }
                return;
            }

            let dx = 0, dy = 0;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W': dy = -1; break;
                case 'ArrowDown': case 's': case 'S': dy = 1; break;
                case 'ArrowLeft': case 'a': case 'A': dx = -1; break;
                case 'ArrowRight': case 'd': case 'D': dx = 1; break;
                case '>':
                    if (map[player.x + ',' + player.y] === 3) {
                        level++;
                        maxLevel = Math.max(maxLevel, level);
                        addLog('You descend to level ' + level + '...');
                        monsters = [];
                        items = [];
                        scheduler = new ROT.Scheduler.Simple();
                        generateMap();
                        placeEntities();
                        updateFOV();
                        scheduler.add(player, true);
                        for (const m of monsters) scheduler.add(m, true);
                        engine = new ROT.Engine(scheduler);
                        engine.start();
                    } else {
                        addLog('There are no stairs here.');
                    }
                    renderLog();
                    return;
                case 'r': case 'R': restart(); return;
                default: return;
            }
            e.preventDefault();

            const nx = player.x + dx;
            const ny = player.y + dy;
            const key = nx + ',' + ny;

            if (map[key] === 1 || map[key] === undefined) return;

            const mob = monsterAt(nx, ny);
            if (mob) {
                attack(mob);
                playerAct();
            } else {
                player.x = nx;
                player.y = ny;
                pickup();
                playerAct();
            }
        };
        document.addEventListener('keydown', keyHandler);
    }

    function playerAct() {
        scheduler.next();
        updateFOV();
        drawAll();
        renderStatus();
        renderLog();
    }

    function attack(mob) {
        const dmg = Math.max(1, player.atk + (player.weapon ? player.weapon.atk : 0) - Math.floor(Math.random() * 2));
        mob.hp -= dmg;
        addLog('You hit the ' + mob.name + ' for ' + dmg + ' damage.');
        if (mob.hp <= 0) {
            addLog('The ' + mob.name + ' dies! +' + mob.xp + ' XP.');
            player.xp += mob.xp;
            monsters = monsters.filter(m => m !== mob);
            if (player.xp >= player.level * 30) {
                player.level++;
                player.maxHp += 5;
                player.hp = Math.min(player.hp + 5, player.maxHp);
                player.atk += 1;
                addLog('Level up! You are now level ' + player.level + '.');
            }
        }
    }

    function pickup() {
        const idx = items.findIndex(i => i.x === player.x && i.y === player.y);
        if (idx === -1) return;

        const item = items[idx];
        items.splice(idx, 1);

        switch (item.type) {
            case 'potion':
                player.hp = Math.min(player.maxHp, player.hp + item.heal);
                addLog('You drink a healing potion. +' + item.heal + ' HP.');
                break;
            case 'scroll':
                addLog('You read a scroll. The dungeon reveals itself!');
                for (const key in map) explored[key] = true;
                break;
            case 'gold':
                const amt = item.min + Math.floor(Math.random() * (item.max - item.min + 1));
                player.gold += amt;
                addLog('You pick up ' + amt + ' gold.');
                break;
            case 'weapon':
                player.weapon = item;
                addLog('You wield a ' + item.name + '. +' + item.atk + ' ATK.');
                break;
            case 'armor':
                player.armor = item;
                player.def += item.def;
                addLog('You put on ' + item.name + '. +' + item.def + ' DEF.');
                break;
            case 'food':
                player.hp = Math.min(player.maxHp, player.hp + item.heal);
                addLog('You eat some food. +' + item.heal + ' HP.');
                break;
            case 'wand':
                addLog('You wave the wand. Nothing happens.');
                break;
        }
    }

    function monsterTurn(mob) {
        if (gameOver) return;

        const dist = Math.abs(mob.x - player.x) + Math.abs(mob.y - player.y);
        if (dist > 10) return;

        if (dist <= 1) {
            const dmg = Math.max(1, mob.atk - (player.armor ? player.armor.def : 0));
            player.hp -= dmg;
            addLog('The ' + mob.name + ' hits you for ' + dmg + ' damage!');
            if (player.hp <= 0) {
                gameOver = true;
                addLog('You die... Press R to restart.');
            }
        } else {
            const passable = function(x, y) { return map[x + ',' + y] !== 1; };
            const astar = new ROT.Path.AStar(player.x, player.y, passable, { topology: 8 });
            let path = [];
            astar.compute(mob.x, mob.y, function(x, y) { path.push([x, y]); });
            if (path.length > 1) {
                mob.x = path[1][0];
                mob.y = path[1][1];
            }
        }
    }

    function addLog(msg) {
        log.push(msg);
        if (log.length > 5) log.shift();
    }

    function renderStatus() {
        const el = document.getElementById('nethack-status');
        if (!el) return;
        const hpPct = Math.floor((player.hp / player.maxHp) * 100);
        const hpColor = hpPct > 50 ? '#4CAF50' : hpPct > 25 ? '#FF9800' : '#F44336';
        el.innerHTML = `
            <span class="nk-stat">HP: <span style="color:${hpColor}">${player.hp}/${player.maxHp}</span></span>
            <span class="nk-stat">ATK: ${player.atk}${player.weapon ? '(+' + player.weapon.atk + ')' : ''}</span>
            <span class="nk-stat">DEF: ${player.def}</span>
            <span class="nk-stat">XP: ${player.xp}</span>
            <span class="nk-stat">Lv: ${player.level}</span>
            <span class="nk-stat">$: ${player.gold}</span>
            <span class="nk-stat">Dungeon: ${level}</span>
        `;
    }

    function renderLog() {
        const el = document.getElementById('nethack-log');
        if (!el) return;
        el.innerHTML = log.map((m, i) => '<div class="nk-log-line"' + (i === log.length - 1 ? ' style="color:#ddd"' : '') + '>' + m + '</div>').join('');
    }

    function restart() {
        document.removeEventListener('keydown', keyHandler);
        if (engine) engine.lock();
        gameOver = false;
        level = 1;
        maxLevel = 1;
        log = [];
        startGame();
        drawAll();
        renderStatus();
        renderLog();
    }

    window.initNetHack = function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        init(container);
    };
})();
