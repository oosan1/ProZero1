let app = new PIXI.Application({ 
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x4287f5,
    //resolution: window.devicePixelRatio || 1,
    antialias: true,
    autoResize: true
});
document.body.appendChild(app.view);

window.addEventListener('resize', resize);

// 変数の初期化
let player_position = {x: 0, y: 0};
let player_position_last = {x: 0, y: 0};
let moving_distance = {x: 0, y: 0};
let maps_scale = 5; //マップ表示スケール
let total_moving_distance = 0; //合計移動距離
const MeterPerPixel = 1; //1ピクセルあたり何メートル
const RunningSpeed = 25714; //走行速度(m/h)
let window_size = {x: window.innerWidth, y: window.innerHeight}

const stick_bg_size = 100 //バーチャルスティック背景の直径
const maps_size = {x: 2000, y: 1000}

// マップスプライト
const maps = PIXI.Sprite.from("testmap01.png");

maps.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
app.stage.addChild(maps);

// バーチャルスティックスプライト
const VS_background_texture = new PIXI.Graphics();
VS_background_texture.lineStyle(3, 0x00000, 0.5, 1);
VS_background_texture.beginFill(0x00000, 0.2, 1);
VS_background_texture.drawCircle(window_size.x - 200, window_size.y - 200, stick_bg_size);
VS_background_texture.endFill();
const VS_background = PIXI.Sprite.from(app.renderer.generateTexture(VS_background_texture));
VS_background.anchor = {x: 0.5, y: 0.5};

const VS_stick_texture = new PIXI.Graphics();
VS_stick_texture.lineStyle(5, 0xcccccc, 1, 1);
VS_stick_texture.beginFill(0xe6e6e6, 1, 1);
VS_stick_texture.drawCircle(0, 0, 40);
VS_stick_texture.endFill();
const VS_stick = PIXI.Sprite.from(app.renderer.generateTexture(VS_stick_texture));
VS_stick.anchor = {x: 0.5, y: 0.5};
VS_stick.eventMode = "static";
VS_stick.cursor = "pointer"
VS_stick.on('pointerdown', onStickDragStart, VS_stick);

// プレイヤースプライト
const player_texture = new PIXI.Graphics();
player_texture.lineStyle(2, 0x000000, 1, 1);
player_texture.beginFill(0xff0000, 1, 1);
player_texture.drawCircle(0, 0, 5);
player_texture.endFill();
const player = PIXI.Sprite.from(app.renderer.generateTexture(player_texture));
player.anchor = {x: 0.5, y: 0.5};

app.stage.addChild(VS_background, VS_stick, player);

resize();
setInterval(function test() {console.log(player_position)}, 100);
setInterval(movePosition, 10);
setInterval(animTick, 50);
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointerup', onDragEnd);
app.stage.on('pointerupoutside', onDragEnd);

function onStickDragStart() {
    app.stage.on('pointermove', onStickDragMove);
}

function onStickDragMove(event) {
    const x1 = event.global.x, y1 = event.global.y, x2 = window_size.x - 200, y2 = window_size.y - 200;
    if ((x1 - x2)**2 + (y1 - y2)**2 >= stick_bg_size**2) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const stick_x = stick_bg_size * -Math.cos(angle) + x2 ;
        const stick_y = stick_bg_size * -Math.sin(angle) + y2;
        VS_stick.position = {x: stick_x, y: stick_y};
        moving_distance = {x: (stick_x - x2) / 100, y: -(stick_y - y2) / 100};

    }else {
        VS_stick.position = event.global;
        moving_distance = {x: (event.global.x - x2) / 100, y: -(event.global.y - y2) / 100};
    }
}
function onDragEnd() {
    app.stage.off('pointermove', onStickDragMove);
    VS_stick.position = {x: window_size.x - 200, y: window_size.y - 200};
    moving_distance = {x: 0, y: 0};
}

function movePosition() { // 走行速度管理
    const RunningSpeed_pixelPerMs = RunningSpeed / (3600000 / 10) / MeterPerPixel //(pixel/ms)
    player_position.x += RunningSpeed_pixelPerMs * moving_distance.x
    player_position.y += RunningSpeed_pixelPerMs * moving_distance.y
};

function animTick() {
    maps.position = {x: -player_position.x * maps_scale + window_size.x / 2, y: player_position.y * maps_scale + window_size.y / 2};
    maps.scale = {x: maps_scale, y: maps_scale};
    total_moving_distance += Math.sqrt(Math.pow(player_position.x - player_position_last.x, 2) + Math.pow(player_position.y - player_position_last.y, 2));
    player_position_last = {x: player_position.x, y: player_position.y};
    document.getElementById('overlay').textContent = `合計移動距離: ${total_moving_distance}m`;
}

function resize() { // ウィンドウリサイズ処理
    window_size = {x: window.innerWidth, y: window.innerHeight};
    app.renderer.resize(window_size.x, window_size.y);
    VS_background.position = {x: window_size.x - 200, y: window_size.y - 200};
    VS_stick.position = {x: window_size.x - 200, y: window_size.y - 200};
    player.position = {x: window_size.x / 2, y: window_size.y / 2};
};
