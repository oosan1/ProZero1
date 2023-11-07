let app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0x4287f5,
  //resolution: window.devicePixelRatio || 1,
  antialias: true,
  autoResize: true,
});
document.body.appendChild(app.view);

window.addEventListener("resize", resize);

// 変数の初期化
let player_position = {x: 5, y: -5};
let player_position_last = {x: 5, y: -5};
let moving_distance = {x: 0, y: 0};
let maps_scale = 15; //マップ表示スケール
let total_moving_distance = 0; //合計移動距離
const moving_msec = 10; // 移動処理を何ミリ秒ごとに行うのか
const MeterPerPixel = 1; //1ピクセルあたり何メートル
const RunningSpeed = 25714; //走行速度(m/h)
const RunningSpeed_pixelPerMs = RunningSpeed / (3600000 / moving_msec) / MeterPerPixel; //(pixel/ms)
console.log(RunningSpeed_pixelPerMs);
let window_size = { x: window.innerWidth, y: window.innerHeight };
let last_time = 0;

// 当たり判定壁をwall.jsからロード
const test_col_lines = wall_colision["1F"];

//壁のベクトル等を事前計算
const line_vectors = []
for (let line of test_col_lines) {
  line_vectors.push(vecNormalize(line));
}

const stick_bg_size = 100; //バーチャルスティック背景の直径
const maps_size = { x: 2000, y: 1000 };

// マップスプライト
const maps = PIXI.Sprite.from("testmap01.png");

maps.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
app.stage.addChild(maps);

// バーチャルスティックスプライト
const VS_background_texture = new PIXI.Graphics();
VS_background_texture.lineStyle(3, 0x00000, 0.5, 1);
VS_background_texture.beginFill(0x00000, 0.2, 1);
VS_background_texture.drawCircle(
  window_size.x - 200,
  window_size.y - 200,
  stick_bg_size,
);
VS_background_texture.endFill();
const VS_background = PIXI.Sprite.from(
  app.renderer.generateTexture(VS_background_texture),
);
VS_background.anchor = { x: 0.5, y: 0.5 };

const VS_stick_texture = new PIXI.Graphics();
VS_stick_texture.lineStyle(5, 0xcccccc, 1, 1);
VS_stick_texture.beginFill(0xe6e6e6, 1, 1);
VS_stick_texture.drawCircle(0, 0, 40);
VS_stick_texture.endFill();
const VS_stick = PIXI.Sprite.from(
  app.renderer.generateTexture(VS_stick_texture),
);
VS_stick.anchor = { x: 0.5, y: 0.5 };
VS_stick.eventMode = "static";
VS_stick.cursor = "pointer";
VS_stick.on("pointerdown", onStickDragStart, VS_stick);

// プレイヤースプライト
const player_texture = new PIXI.Graphics();
player_texture.lineStyle(2, 0x000000, 1, 1);
player_texture.beginFill(0xff0000, 1, 1);
player_texture.drawCircle(0, 0, 5);
player_texture.endFill();
const player = PIXI.Sprite.from(app.renderer.generateTexture(player_texture));
player.anchor = { x: 0.5, y: 0.5 };

// テスト表示スプライト
const test_texture = new PIXI.Graphics();
test_texture.lineStyle(2, 0x000000, 1, 1);
test_texture.beginFill(0xfff000, 1, 1);
test_texture.drawCircle(0, 0, 5);
test_texture.endFill();
const test_sp = PIXI.Sprite.from(app.renderer.generateTexture(test_texture));
test_sp.anchor = { x: 0.5, y: 0.5 };

app.stage.addChild(VS_background, VS_stick, player, test_sp);

resize();
setTimeout(movePosition, moving_msec);
setInterval(animTick, 16);
app.stage.eventMode = "static";
app.stage.hitArea = app.screen;
app.stage.on("pointerup", onDragEnd);
app.stage.on("pointerupoutside", onDragEnd);

function onStickDragStart() {
  // バーチャルスティック管理
  app.stage.on("pointermove", onStickDragMove);
}

function onStickDragMove(event) {
  const x1 = event.global.x,
    y1 = event.global.y,
    x2 = window_size.x - 200,
    y2 = window_size.y - 200;
  if ((x1 - x2) ** 2 + (y1 - y2) ** 2 >= stick_bg_size ** 2) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const stick_x = stick_bg_size * -Math.cos(angle) + x2;
    const stick_y = stick_bg_size * -Math.sin(angle) + y2;
    VS_stick.position = { x: stick_x, y: stick_y };
    moving_distance = { x: (stick_x - x2) / 100, y: -(stick_y - y2) / 100 };
  } else {
    VS_stick.position = event.global;
    moving_distance = {
      x: (event.global.x - x2) / 100,
      y: -(event.global.y - y2) / 100,
    };
  }
}
function onDragEnd() {
  app.stage.off("pointermove", onStickDragMove);
  VS_stick.position = { x: window_size.x - 200, y: window_size.y - 200 };
  moving_distance = { x: 0, y: 0 };
}

function movePosition() {
  const first_time = performance.now();
  // 位置情報管理
  let afterCollision_position = { x: 0, y: 0 };
  let updated_player_position = { x: 0, y: 0 };
  let isIntersected = false;
  let Intersect_count = 0;
  const new_player_position_temp = {
    x: player_position.x + RunningSpeed_pixelPerMs * moving_distance.x,
    y: player_position.y + RunningSpeed_pixelPerMs * moving_distance.y,
  };
  let collision_detection = {};
  let count = 0;
  //この当たり判定処理を関数へ
  //壁の当たり判定
  for (let line of test_col_lines) {
      if (!isIntersected) { collision_detection = collision(line, [{x: player_position.x, y: player_position.y}, {x: new_player_position_temp.x, y: new_player_position_temp.y}]); }
      afterCollision_position = shortest_distance(line, {x: new_player_position_temp.x, y: new_player_position_temp.y}, -0.01, count);
      if (afterCollision_position[1] < 0.03 && afterCollision_position[2]) { Intersect_count += 1; } //距離が近い壁の個数をカウント
      if (Intersect_count > 1) { 
        //近くに壁が2つある場合はすり抜け防止のために移動しない
        updated_player_position = player_position;
        break;
      }
      if (!isIntersected) {
          if (collision_detection["isIntersect"]) {
            updated_player_position = afterCollision_position[0];
            isIntersected = true;
          }else {
            updated_player_position = new_player_position_temp;
          };
      }
      count++;
  }

  //階段の判定
  for (let stair_line of stairs["1F_UP"]) {
    collision_detection = collision(stair_line["line"], [{x: player_position.x, y: player_position.y}, {x: new_player_position_temp.x, y: new_player_position_temp.y}]);
    if (collision_detection["isIntersect"]) {
      updated_player_position = stair_line["destination"];
    }
  }

  total_moving_distance += Math.sqrt(
    Math.pow(updated_player_position.x - player_position.x, 2) +
      Math.pow(updated_player_position.y - player_position.y, 2),
  );
  
  console.log(performance.now() - last_time);
  last_time = performance.now();
  player_position.x = updated_player_position.x;
  player_position.y = updated_player_position.y;

  const end_time = performance.now();
  setTimeout(movePosition, moving_msec - (end_time - first_time));
}

function collision(pos1, pos2) {
  // 当たり判定
  //posN = [{x:0, y:0}, {x:0, y:0}] A:pos1[0] B:pos1[1] C:pos2[0] D:pos2[1]

  let intersect_pos = { x: 0, y: 0 };
  const ACx = pos2[0].x - pos1[0].x;
  const ACy = pos2[0].y - pos1[0].y;
  const denominator =
    (pos1[1].x - pos1[0].x) * (pos2[1].y - pos2[0].y) -
    (pos1[1].y - pos1[0].y) * (pos2[1].x - pos2[0].x);
  if (denominator == 0) {
    return { isIntersect: false, intersect_pos: intersect_pos }; //2線分が平行もしくは重なっている
  }
  r =
    ((pos2[1].y - pos2[0].y) * ACx - (pos2[1].x - pos2[0].x) * ACy) /
    denominator;
  s =
    ((pos1[1].y - pos1[0].y) * ACx - (pos1[1].x - pos1[0].x) * ACy) /
    denominator;
  if (r < 0 || r > 1 || s < 0 || s > 1) {
    return { isIntersect: false, intersect_pos: intersect_pos }; //2線分が交差しない
  }
  intersect_pos = {
    x: pos1[0].x + (pos1[1].x - pos1[0].x) * r,
    y: pos1[0].y + (pos1[1].y - pos1[0].y) * s,
  };
  //const distance = Math.sqrt(Math.pow(intersect_pos.x - pos2[0].x, 2) + Math.pow(intersect_pos.y - pos2[0].y, 2));
  return { isIntersect: true, intersect_pos: intersect_pos };

  //https://www.hiramine.com/programming/graphics/2d_segmentintersection.html
}

function shortest_distance(line, point, margin, line_index) {
  //line = [{x: 0, y: 0}, {x: 10, y: 10}], point = {x: 5, y: 5}

  let onLine = false; //最短点が線上にあるかどうか
  const line_norm_vec2 = line_vectors[line_index][0];
  line_vec2_mag = line_vectors[line_index][1];
  const lineToPoint_vec2 = { x: point.x - line[0].x, y: point.y - line[0].y }; //線の始点とpointのベクトル
  const shortest_times =
    line_norm_vec2.x * lineToPoint_vec2.x +
    line_norm_vec2.y * lineToPoint_vec2.y;
  const shortest_point = {
    x: line[0].x + line_norm_vec2.x * shortest_times,
    y: line[0].y + line_norm_vec2.y * shortest_times,
  };

  //マージン
  const pointToRes_vec2 = {
    x: point.x - shortest_point.x,
    y: point.y - shortest_point.y,
  };
  const pointToRes_vec2_mag = Math.sqrt(
    pointToRes_vec2.x ** 2 + pointToRes_vec2.y ** 2,
  );
  const margin_times = margin / pointToRes_vec2_mag;
  const res_point = {
    x: shortest_point.x + pointToRes_vec2.x * margin_times,
    y: shortest_point.y + pointToRes_vec2.y * margin_times,
  };
  if (shortest_times > 0 && line_vec2_mag > shortest_times) {
    onLine = true;
  }
  return [res_point, pointToRes_vec2_mag, onLine];
  //https://www.nekonecode.com/math-lab/pages/collision2/point-and-line-nearest/
}

function animTick() {
  //アニメーション処理
  maps.position = {
    x: -player_position.x * maps_scale + window_size.x / 2,
    y: player_position.y * maps_scale + window_size.y / 2,
  };
  maps.scale = { x: maps_scale, y: maps_scale };
  //total_moving_distance += Math.sqrt(Math.pow(player_position.x - player_position_last.x, 2) + Math.pow(player_position.y - player_position_last.y, 2));
  //player_position_last = {x: player_position.x, y: player_position.y};
  document.getElementById(
    "overlay",
  ).textContent = `合計移動距離: ${total_moving_distance}m`;
}

function resize() {
  // ウィンドウリサイズ処理
  window_size = { x: window.innerWidth, y: window.innerHeight };
  app.renderer.resize(window_size.x, window_size.y);
  VS_background.position = { x: window_size.x - 200, y: window_size.y - 200 };
  VS_stick.position = { x: window_size.x - 200, y: window_size.y - 200 };
  player.position = { x: window_size.x / 2, y: window_size.y / 2 };
}

function vecNormalize(line) {
  const line_vec2 = { x: line[1].x - line[0].x, y: line[1].y - line[0].y }; // 線のベクトル
  const line_vec2_mag = Math.sqrt(line_vec2.x ** 2 + line_vec2.y ** 2); // ベクトルの大きさ
  const line_norm_vec2 = {
    x: line_vec2.x / line_vec2_mag,
    y: line_vec2.y / line_vec2_mag,
  };

  return [line_norm_vec2, line_vec2_mag];
}
