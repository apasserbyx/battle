const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player; // 玩家对象
let enemies = [];
let cursors;
let enemyBullets = [];
let playerSize = 50; // 玩家初始大小
let playerSpeed = 600; // 玩家初始速度
let minSpeed = 300; // 最低速度
let maxSpeed = 900; // 最高速度
let healthText;
let enemyFireRate = 1000; // 敌人子弹发射间隔（毫秒）
let enemyShootingEnabled = true; // 控制敌人射击的开关

function preload() {
    // 加载玩家、敌人和背景图片
    this.load.image('player', 'assets/player0.png');
    this.load.image('enemy', 'assets/enemy.png');
    this.load.image('background', 'assets/back.png'); // 背景图片
}

function create() {
    // 添加背景图片
    const background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    background.setDisplaySize(config.width, config.height); // 调整背景大小以适应窗口

    // 创建玩家
    player = this.physics.add.sprite(config.width / 2, config.height / 2, 'player');
    player.setDisplaySize(playerSize, playerSize);
    player.setCollideWorldBounds(true);


    // 创建迷宫阻挡区域
    const mazeBlocks = [];

    // 定义迷宫的网格大小
    const rows = 9; // 行数
    const cols = 9; // 列数
    const cellWidth = config.width / cols; // 每个单元格的宽度
    const cellHeight = config.height / rows; // 每个单元格的高度

    // 创建迷宫的墙壁
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            // 仅在某些条件下添加墙壁，形成迷宫
            if (
                (row % 2 === 0 && col % 2 === 0) || // 棋盘格样式
                (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) // 边界墙
            ) {
                // 跳过入口和出口
                if ((row === 0 && col === 1) || (row === rows - 1 && col === cols - 2)) {
                    continue;
                }

                const block = this.add.rectangle(
                    col * cellWidth + cellWidth / 2,
                    row * cellHeight + cellHeight / 2,
                    cellWidth - 5,
                    cellHeight - 5,
            0x888888,
            0.8
        );
                this.physics.add.existing(block, true);
                mazeBlocks.push(block);
    }
        }
    }

    // 添加玩家与迷宫墙壁的碰撞
    mazeBlocks.forEach((block) => {
        this.physics.add.collider(player, block);
    });

    // 创建初始敌人
    for (let i = 0; i < 10; i++) {
        createEnemy(this);
    }

    // 设置键盘输入
    cursors = this.input.keyboard.createCursorKeys();

    // 显示玩家大小
    healthText = this.add.text(10, 10, `Size: ${playerSize}`, {
        fontSize: '20px',
        fill: '#ffffff'
    });

    // 创建切换射击功能的按钮
    const toggleButton = this.add.text(10, 40, '切换射击: 开启', {
        fontSize: '20px',
        fill: '#ffffff',
        backgroundColor: '#0000ff',
        padding: { x: 10, y: 5 }
    }).setInteractive();

    // 添加按钮点击事件
    toggleButton.on('pointerdown', () => {
        enemyShootingEnabled = !enemyShootingEnabled;
        toggleButton.setText(`切换射击: ${enemyShootingEnabled ? '开启' : '关闭'}`);
    });

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
    });
}

function update() {
    // 玩家移动
    const speed = Phaser.Math.Clamp(playerSpeed / playerSize, minSpeed, maxSpeed);

    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
        player.setVelocityY(speed);
    } else {
        player.setVelocityY(0);
    }

    // 更新敌人子弹
    enemyBullets = enemyBullets.filter((bullet) => {
        bullet.sprite.x += bullet.direction.x * bullet.speed;
        bullet.sprite.y += bullet.direction.y * bullet.speed;

        if (Phaser.Geom.Intersects.RectangleToRectangle(bullet.sprite.getBounds(), player.getBounds())) {
            // 玩家被敌人子弹击中
            playerSize -= 5;
            if (playerSize < 10) {
                playerSize = 10;
            }
            player.setDisplaySize(playerSize, playerSize);
            bullet.sprite.destroy();
            healthText.setText(`Size: ${playerSize}`);
            return false;
        }

        return true;
    });

    // 敌人随机移动
    enemies.forEach((enemy) => {
        const enemySpeed = Phaser.Math.Clamp(200 / enemy.size, minSpeed, maxSpeed);
        if (enemy.sprite.body.velocity.x === 0 || enemy.sprite.body.velocity.y === 0) {
            enemy.sprite.body.setVelocity(
                Phaser.Math.Between(-enemySpeed, enemySpeed),
                Phaser.Math.Between(-enemySpeed, enemySpeed)
            );
        }
    });

    // 检测敌人数量并生成新敌人
    if (enemies.length < 10) {
        createEnemy(this);
    }
}

function createEnemy(scene) {
    const x = Phaser.Math.Between(50, config.width - 50);
    const y = Phaser.Math.Between(50, config.height - 50);
    const size = Phaser.Math.Between(10, 40); // 敌人大小随机
    const enemy = scene.physics.add.sprite(x, y, 'enemy');
    enemy.setDisplaySize(size * 10, size * 10); // 设置敌人大小
    enemy.setCollideWorldBounds(true);
    const enemySpeed = Phaser.Math.Clamp(200 / size, minSpeed, maxSpeed);
    enemy.body.setVelocity(
        Phaser.Math.Between(-enemySpeed, enemySpeed),
        Phaser.Math.Between(-enemySpeed, enemySpeed)
    );
    enemies.push({ sprite: enemy, size: size });

    // 添加碰撞检测
    scene.physics.add.overlap(player, enemy, handleCollision, null, scene);

    // 定时发射子弹
    scene.time.addEvent({
        delay: enemyFireRate,
        callback: () => fireEnemyBullet(scene, enemy),
        loop: true
    });
}

function handleCollision(playerSprite, enemySprite) {
    const enemy = enemies.find((e) => e.sprite === enemySprite);

    if (playerSize > enemy.size) {
        // 玩家吞噬敌人
        playerSize += enemy.size / 2;
        player.setDisplaySize(playerSize, playerSize);
        enemy.sprite.destroy();
        enemies = enemies.filter((e) => e.sprite !== enemySprite);
        healthText.setText(`Size: ${playerSize}`);
    } else {
        // 玩家被敌人吞噬，游戏结束
        if (playerSize <= enemy.size) {
            this.physics.pause(); // 仅在玩家被吞噬时暂停游戏
            healthText.setText('Game Over!');
        }
    }
}

function fireEnemyBullet(scene, enemy) {
    if (!enemyShootingEnabled) return; // 如果开关关闭，则不执行射击逻辑

    const bullet = scene.add.circle(enemy.x, enemy.y, 5, 0xffff00); // 敌人子弹为黄色
    scene.physics.add.existing(bullet);

    const direction = {
        x: Phaser.Math.Between(-1, 1),
        y: Phaser.Math.Between(-1, 1)
    };
    const bulletSpeed = 5; // 敌人子弹速度
    enemyBullets.push({
        sprite: bullet,
        direction: direction,
        speed: bulletSpeed
    });
}
