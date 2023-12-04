//FireStoreの設定
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, collection, setDoc, addDoc, getDocs, updateDoc, deleteDoc, deleteField,serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
const firebaseConfig = {
  apiKey: "AIzaSyBZYfykcuDQIiujKHH4KeizUUWxtS9XQNQ",
  authDomain: "prozero-4a3a8.firebaseapp.com",
  projectId: "prozero-4a3a8",
  storageBucket: "prozero-4a3a8.appspot.com",
  messagingSenderId: "102822475419",
  appId: "1:102822475419:web:b6cdf6d89cf8d89b08f83e",
  measurementId: "G-NM04BP5XQX"
};
const fire_app = initializeApp(firebaseConfig);
const db = getFirestore(fire_app);

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


let first_floor
if (Math.floor( Math.random() * 10 ) == 0) {
  first_floor = "4";
}else {
  first_floor = String(Math.floor( Math.random() * 4 ) + 1);
}

let floor = first_floor;
const random_player_pos = Math.floor( Math.random() * player_position_candidate[floor].length);
const first_player_position = player_position_candidate[floor][random_player_pos];
let player_position = {
  x: player_position_candidate[floor][random_player_pos].x,
  y: player_position_candidate[floor][random_player_pos].y
}

const first_player_position_radius = 32;
let player_position_last = {x: 5, y: -5};
let moving_distance = {x: 0, y: 0};
let maps_scale = 3; //マップ表示スケール constでもいい
let total_moving_distance = 0; //合計移動距離
const MeterPerPixel = 0.032153846; //1ピクセルあたり何メートル
const RunningSpeed =10000; //走行速度(m/h)
const wall_margin = 5; //壁のすり抜け防止のために伸ばす量
const wall_detection_margin = 10; //軽量化のために計算を無視する壁までの距離
const wall_corner_margin = 2; //壁の角に丸いすり抜け防止当たり判定
let isGameStart = false;
const AED_Getting_time = 3; //AEDを取り出す際にかかる時間
const AED_Using_time = 60; //AED到着から使用までの時間


let RunningSpeed_pixelPerMs = RunningSpeed / (3600000 / 5) / MeterPerPixel; //(pixel/ms)
let window_size = { x: window.innerWidth, y: window.innerHeight };
let last_time = 0;
let AED_Flag = false;
let AED_get_pos = {}; 
let AED_get_floor = 1;
let end_Flag = false;
let AED_get_time = 0;
let moving_time = 0;

// 当たり判定壁をwall.jsからロード
//壁のベクトル等を事前計算
let wall_vectors = {};
let wall_vectors_list = [];
for (let [key, value] of Object.entries(wall_colision)) {
  for (let line of value) {
    wall_vectors_list.push(vecNormalize(line));
  }
  wall_vectors[key] = wall_vectors_list;
  wall_vectors_list = [];
}


const stick_bg_size = 100; //バーチャルスティック背景の直径

// マップスプライト
const maps_texture = {};
for (let i = 1; i < 5; i++) {
  console.log(i)
  maps_texture[String(i)] = PIXI.Texture.from(`maps/${i}.png`);
}
const maps = new PIXI.Sprite();
maps.texture = maps_texture[floor];
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

// AEDスプライト
let AED_sprites = {};
for (let [key, value] of Object.entries(AED_position)) {
  let AED_list = [];
  for (let aed of value) {
    let AED_sprite = PIXI.Sprite.from("maps/AED.png");
    AED_sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    AED_sprite.anchor = { x: 0.5, y: 0.5 };
    app.stage.addChild(AED_sprite);
    AED_list.push(AED_sprite);
  }
  AED_sprites[key] = AED_list;
}

//スタートスプライト
const start_sprite = PIXI.Sprite.from("maps/start.png")
start_sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
start_sprite.anchor = { x: 0.5, y: 0.5 };

app.stage.addChild(VS_background, VS_stick, player, start_sprite);

resize();
setInterval(movePosition, 5);
setInterval(animTick, 16);
app.stage.eventMode = "static";
app.stage.hitArea = app.screen;
app.stage.on("pointerup", onDragEnd);
app.stage.on("pointerupoutside", onDragEnd);
let game_start_time = 0;

function onStickDragStart() {
  // バーチャルスティック管理
  app.stage.on("pointermove", onStickDragMove);
}

function onStickDragMove(event) {
  if (!isGameStart) {
    isGameStart = true;
    game_start_time = Date.now();
    console.log(Math.floor( Math.random() * player_position_candidate[floor].length ))
    console.log(first_floor)

  }
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
  // 位置情報管理
  let updated_player_position = { x: 0, y: 0 };
  const moving_sec = performance.now() - last_time;
  RunningSpeed_pixelPerMs = RunningSpeed / (3600000 / moving_sec) / MeterPerPixel; //処理速度に合わせて調整する
  last_time = performance.now();
  const planned_position = {
    x: player_position.x + RunningSpeed_pixelPerMs * moving_distance.x,
    y: player_position.y + RunningSpeed_pixelPerMs * moving_distance.y,
  };

  //当たり判定
  updated_player_position = collision_detection(wall_colision[floor], planned_position)

  //階段の判定
  let intersecting = false;
  for (let stair_line of stairs[String(floor)]) {
    intersecting = collision(stair_line["line"], [{x: player_position.x, y: player_position.y}, {x: planned_position.x, y: planned_position.y}]);
    if (intersecting) {
      floor = stair_line["floor"];
      updated_player_position = stair_line["destination"];
      maps.texture = maps_texture[floor];
      maps.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
    }
  }

  if (!end_Flag) {
    if (AED_Flag) {
      if (first_player_position_radius**2 > (first_player_position.x - updated_player_position.x)**2 + (first_player_position.y - updated_player_position.y)**2) {
        end_Flag = true;
        moving_time = Date.now() - game_start_time;
        const all_time = moving_time + AED_Getting_time*1000 + AED_Using_time*1000;
        const getdata = async function get(){
          const CategoryCol = collection(db, "score");
          const Snapshot = await getDocs(CategoryCol);
          const score_db = Snapshot.docs.map(doc => doc.data());
          console.log(score_db)
          let All_db = score_db[0]["All"];
          let Avg_db = score_db[0]["Avg"];
          let Avg2_db = score_db[0]["Avg2"];
          const survival_rate = 100 - all_time / 1000 / 60 * 10
          const Sx = Math.sqrt(Avg2_db-Avg_db**2);
          const Deviation = (survival_rate-Avg_db)/Sx*10+50;

          if (survival_rate > 30) {
            if (All_db == 0) {
              Avg_db = survival_rate;
              Avg2_db = survival_rate**2;
              All_db = 1;
            }else {
              Avg_db = (Avg_db*All_db + survival_rate)/(All_db + 1);
              Avg2_db = (Avg2_db*All_db + survival_rate**2)/(All_db + 1);
              All_db = All_db + 1;
            }
            updateDoc(doc(db, "score", "value"), {
              All: All_db,
              Avg: Avg_db,
              Avg2: Avg2_db
            })
          }

          //終了画面を表示
          const EndPage = document.getElementById("end_overlay");
          const EndTime = document.getElementById("end_time_text");
          const EndTime2 = document.getElementById("end_time2_text");
          const EndTime3 = document.getElementById("end_time3_text");
          const EndTime4 =  document.getElementById("end_time4_text");
          const EndPer = document.getElementById("end_per_text");
          EndPage.style.display = "block";
          EndPer.innerText = `救命率: ${Math.floor(survival_rate)}%`
          EndTime.innerText = `全体時間: ${Math.floor(all_time / 1000 / 60)}m${Math.floor(all_time / 1000 % 60)}s`
          EndTime2.innerText = `AED取得までの時間: ${Math.floor(AED_get_time / 1000 / 60)}m${Math.floor(AED_get_time / 1000 % 60)}s`
          EndTime3.innerText = `AED取得から戻るまでの時間: ${Math.floor((moving_time - AED_get_time) / 1000 / 60)}m${Math.floor((moving_time -AED_get_time) / 1000 % 60)}s`
          EndTime4.innerText = `救命率偏差値: ${Math.floor(Deviation)}`
          //https://www.youtube.com/watch?v=VfCdHO5Y7jw

          //プレイ回数をCookieから算出
          const play_count = (document.cookie.split("1") || []).length;
          document.cookie = `count=${"1".repeat(play_count)}`;
          //データをデータベースに追加
          addDoc(collection(db, "users"), {
            startPoint: first_player_position,
            startFloor: first_floor,
            AEDPoint: AED_get_pos,
            AEDFloor: AED_get_floor,
            all_moving_dis: total_moving_distance,
            AED_get_time: AED_get_time,
            moving_time: moving_time,
            all_time: all_time,
            survival_rate: 100 - all_time / 1000 / 60 * 10,
            moving_speed: RunningSpeed,
            play_count: Number(play_count),
            deviation: Deviation,
            timestamp: serverTimestamp()
          })
        }
        getdata();
      }
    } else {
      for (let AEDs of AED_position[String(floor)]) {
        let AED = AEDs
        if (AED_position[String(floor)].length == 1) {
          if (!AED) {
            break;
          }
          if (AED["radius"]**2 > (AED["point"].x - updated_player_position.x)**2 + (AED["point"].y - updated_player_position.y)**2) {
            AED_get_pos = {x: AED["point"].x, y:AED["point"].y};
            AED_get_floor = String(floor);
            AED_Flag = true;
            AED_get_time = Date.now() - game_start_time;
            document.getElementById(
              "game_overlay",
            ).innerText  = "AED: 所持\n行動: スタート地点へ戻ってください";
          }
        } else {
          // 同じ階にAEDが複数個ある場合は反復
          for (let AED of AEDs) {
            if (!AED) {
              break;
            }
            if (AED["radius"]**2 > (AED["point"].x - updated_player_position.x)**2 + (AED["point"].y - updated_player_position.y)**2) {
              AED_Flag = true;
              AED_get_time = Date.now() - game_start_time;
            }
          }
        }
      }
    }
  }
  if (!intersecting) {
    // 階段で移動した場合は座標がずれるため、total_moving_distanceを変化させない
    total_moving_distance += Math.sqrt(
      Math.pow((updated_player_position.x - player_position.x)*MeterPerPixel, 2) +
      Math.pow((updated_player_position.y - player_position.y)*MeterPerPixel, 2),
    );
  }

  player_position.x = updated_player_position.x;
  player_position.y = updated_player_position.y;

}

function collision_detection(wall, new_position) {
  let updated_player_position;
  let line_nearest_point = {};
  let wasIntersected = false;
  let intersecting
  let nearby_count = 0;
  let count = 0;
  for (let line of wall) {
    line_nearest_point = nearest_point(line, {x: new_position.x, y: new_position.y}, -0.01, wall_vectors[String(floor)][count]);
    if (line_nearest_point[1] < wall_corner_margin && line_nearest_point[2]) { nearby_count++; } //距離が近い壁の個数をカウント
    if (nearby_count > 1) { return player_position; }
    if (!wasIntersected) {
      if (line_nearest_point[1] < wall_detection_margin) {
        //線とのベクトルがn未満なら(線と近いなら)
        intersecting = collision(line, [{x: player_position.x, y: player_position.y}, {x: new_position.x, y: new_position.y}]);
      }
      if (intersecting) {
        updated_player_position = line_nearest_point[0];
        wasIntersected = true;
      }else {
        updated_player_position = new_position;
      }
    }
    count++;
  }
  return updated_player_position;
}

function collision(pos1, pos2) {
  // 交点を求める
  //posN = [{x:0, y:0}, {x:0, y:0}] A:pos1[0] B:pos1[1] C:pos2[0] D:pos2[1]

  let intersect_pos = { x: 0, y: 0 };
  const ACx = pos2[0].x - pos1[0].x;
  const ACy = pos2[0].y - pos1[0].y;
  const denominator =
    (pos1[1].x - pos1[0].x) * (pos2[1].y - pos2[0].y) -
    (pos1[1].y - pos1[0].y) * (pos2[1].x - pos2[0].x);
  if (denominator == 0) {
    return false; //2線分が平行もしくは重なっている
  }
  const r =
    ((pos2[1].y - pos2[0].y) * ACx - (pos2[1].x - pos2[0].x) * ACy) /
    denominator;
  const s =
    ((pos1[1].y - pos1[0].y) * ACx - (pos1[1].x - pos1[0].x) * ACy) /
    denominator;
  if (r < 0 || r > 1 || s < 0 || s > 1) {
    return false; //2線分が交差しない
  }
  intersect_pos = {
    x: pos1[0].x + (pos1[1].x - pos1[0].x) * r,
    y: pos1[0].y + (pos1[1].y - pos1[0].y) * s,
  };
  //const distance = Math.sqrt(Math.pow(intersect_pos.x - pos2[0].x, 2) + Math.pow(intersect_pos.y - pos2[0].y, 2));
  return true;

  //https://www.hiramine.com/programming/graphics/2d_segmentintersection.html
}

function nearest_point(line, point, margin, line_vec2) {
  //line = [{x: 0, y: 0}, {x: 10, y: 10}], point = {x: 5, y: 5}

  let onLine = false; //最短点が線上にあるかどうか
  const line_norm_vec2 = line_vec2[0];
  const line_vec2_mag = line_vec2[1];
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
  if (shortest_times > -wall_margin && line_vec2_mag + wall_margin > shortest_times) {
    onLine = true;
  }
  return [res_point, pointToRes_vec2_mag, onLine];
  //https://www.nekonecode.com/math-lab/pages/collision2/point-and-line-nearest/
}

function animTick() {
  //マップ移動
  maps.position = {
    x: -player_position.x * maps_scale + window_size.x / 2,
    y: player_position.y * maps_scale + window_size.y / 2,
  };
  maps.scale = { x: maps_scale, y: maps_scale };

  //AED移動
  for (let [key, value] of Object.entries(AED_sprites)) {
    if (key != String(floor)) {
      for (let AED_sprite of value) {
        AED_sprite.alpha = 0;
      }
      continue;
    }
    for (let i = 0; i < value.length; i++) {
      value[i].alpha = 1;
      value[i].position = {
        x: -player_position.x * maps_scale + window_size.x / 2 + AED_position[key][i]["point"].x * maps_scale,
        y: player_position.y * maps_scale + window_size.y / 2 + -AED_position[key][i]["point"].y * maps_scale
      };
      value[i].scale = { x: maps_scale, y: maps_scale };
    }
  }

  //スタート地点移動
  if (first_floor != String(floor)) {
    start_sprite.alpha = 0;
  } else {
    start_sprite.alpha = 1;
  }
  start_sprite.position = {
    x: -player_position.x * maps_scale + window_size.x / 2 + first_player_position.x * maps_scale,
    y: player_position.y * maps_scale + window_size.y / 2 + -first_player_position.y * maps_scale,
  };
  start_sprite.scale = { x: maps_scale, y: maps_scale };
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
