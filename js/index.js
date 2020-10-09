"use strict";
//collision groups
//   cat.player | cat.map | cat.body | cat.bullet | cat.powerUp | cat.mob | cat.mobBullet | cat.mobShield | cat.phased
const cat = {
  player: 0x1,
  map: 0x10,
  body: 0x100,
  bullet: 0x1000,
  powerUp: 0x10000,
  mob: 0x100000,
  mobBullet: 0x1000000,
  mobShield: 0x10000000,
  phased: 0x100000000,
}

function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

// shrink power up selection menu to find window height
if (screen.height < 800) {
  document.getElementById("choose-grid").style.fontSize = "1em"; //1.3em is normal
  if (screen.height < 600) document.getElementById("choose-grid").style.fontSize = "0.8em"; //1.3em is normal
}

//example  https://landgreen.github.io/sidescroller/index.html?
//          &gun1=minigun&gun2=laser
//          &mod1=laser-bot&mod2=mass%20driver&mod3=overcharge&mod4=laser-bot&mod5=laser-bot&field=phase%20decoherence%20field&difficulty=2
//add ? to end of url then for each power up add
// &gun1=name&gun2=name
// &mod1=laser-bot&mod2=mass%20driver&mod3=overcharge&mod4=laser-bot&mod5=laser-bot
// &field=phase%20decoherence%20field
// &difficulty=2
//use %20 for spaces
//difficulty is 0 easy, 1 normal, 2 hard, 4 why
function getUrlVars() {
  let vars = {};
  window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, k, v) {
    vars[k] = v;
  });
  return vars;
}
window.addEventListener('load', (event) => {
  const set = getUrlVars()
  if (Object.keys(set).length !== 0) {
    // game.startGame()
    openCustomBuildMenu();
    //add custom selections based on url
    for (const property in set) {
      // console.log(set[property], property);
      set[property] = set[property].replace(/%20/g, " ")
      set[property] = set[property].replace(/%CE%A8/g, "Ψ")

      if (property === "field") {
        let found = false
        let index
        for (let i = 0; i < mech.fieldUpgrades.length; i++) {
          if (set[property] === mech.fieldUpgrades[i].name) {
            index = i;
            found = true;
            break;
          }
        }
        if (found) build.choosePowerUp(document.getElementById(`field-${index}`), index, 'field')
      }

      if (property.substring(0, 3) === "gun") {
        let found = false
        let index
        for (let i = 0; i < b.guns.length; i++) {
          if (set[property] === b.guns[i].name) {
            index = i;
            found = true;
            break;
          }
        }
        if (found) build.choosePowerUp(document.getElementById(`gun-${index}`), index, 'gun')
      }

      if (property.substring(0, 3) === "mod") {
        for (let i = 0; i < mod.mods.length; i++) {
          if (set[property] === mod.mods[i].name) {
            build.choosePowerUp(document.getElementById(`mod-${i}`), i, 'mod', true)
            break;
          }
        }
      }

      if (property === "difficulty") {
        game.difficultyMode = Number(set[property])
        document.getElementById("difficulty-select-custom").value = Number(set[property])
      }
      if (property === "level") {
        document.getElementById("starting-level").value = Number(set[property])
      }
    }
  }
});



//set up canvas
var canvas = document.getElementById("canvas");
//using "const" causes problems in safari when an ID shares the same name.
const ctx = canvas.getContext("2d");
document.body.style.backgroundColor = "#fff";

//disable pop up menu on right click
document.oncontextmenu = function () {
  return false;
}

function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.width2 = canvas.width / 2; //precalculated because I use this often (in mouse look)
  canvas.height2 = canvas.height / 2;
  canvas.diagonal = Math.sqrt(canvas.width2 * canvas.width2 + canvas.height2 * canvas.height2);
  // ctx.font = "18px Arial";
  // ctx.textAlign = "center";
  ctx.font = "25px Arial";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // ctx.lineCap='square';
  game.setZoom();
}
setupCanvas();
window.onresize = () => {
  setupCanvas();
};


//build build grid display
const build = {
  onLoadPowerUps() {
    const set = getUrlVars()
    if (Object.keys(set).length !== 0) {
      for (const property in set) {
        // console.log(`${property}: ${give[property]}`);
        set[property] = set[property].replace(/%20/g, " ")
        if (property.substring(0, 3) === "gun") b.giveGuns(set[property])
        if (property.substring(0, 3) === "mod") mod.giveMod(set[property])
        if (property === "field") mech.setField(set[property])
        if (property === "difficulty") {
          game.difficultyMode = Number(set[property])
          document.getElementById("difficulty-select").value = Number(set[property])
        }
        if (property === "level") {
          level.levelsCleared += Number(set[property]);
          level.difficultyIncrease(Number(set[property]) * game.difficultyMode) //increase difficulty based on modes
          spawn.setSpawnList(); //picks a couple mobs types for a themed random mob spawns
          level.onLevel++
        }
      }

      for (let i = 0; i < bullet.length; ++i) Matter.World.remove(engine.world, bullet[i]);
      bullet = []; //remove any bullets that might have spawned from mods
      if (b.inventory.length > 0) {
        b.activeGun = b.inventory[0] //set first gun to active gun
        game.makeGunHUD();
      }
    }
  },
  pauseGrid() {
    let text = `
    <div class="pause-grid-module">
      <span style="font-size:1.5em;font-weight: 600;">PAUSED</span> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; press P to resume
    </div>
    <div class="pause-grid-module" style = "font-size: 13px;line-height: 120%;padding: 5px;">
      <strong class='color-d'>damage</strong> increase: ${((mod.damageFromMods()-1)*100).toFixed(0)}%
      <br><strong class='color-harm'>harm</strong> reduction: ${((1-mech.harmReduction())*100).toFixed(0)}%
      <br><strong>fire delay</strong> decrease: ${((1-b.fireCD)*100).toFixed(0)}%
      <br>
      <br><strong class='color-r'>rerolls</strong>: ${powerUps.reroll.rerolls}
      <br><strong class='color-h'>health</strong>: (${(mech.health*100).toFixed(0)} / ${(mech.maxHealth*100).toFixed(0)}) &nbsp; <strong class='color-f'>energy</strong>: (${(mech.energy*100).toFixed(0)} / ${(mech.maxEnergy*100).toFixed(0)})
      <br>position: (${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}) &nbsp; velocity: (${player.velocity.x.toFixed(1)}, ${player.velocity.y.toFixed(1)})
      <br>mouse: (${game.mouseInGame.x.toFixed(1)}, ${game.mouseInGame.y.toFixed(1)}) &nbsp; mass: ${player.mass.toFixed(1)}      
      <br>
      <br>level: ${level.levelsCleared} - ${level.levels[level.onLevel]} (${level.difficultyText()}) &nbsp; ${mech.cycle} cycles
      <br>${mob.length} mobs, &nbsp; ${body.length} blocks, &nbsp; ${bullet.length} bullets, &nbsp; ${powerUp.length} power ups      
      <br>damage difficulty scale: ${(b.dmgScale*100).toFixed(2) }%
      <br>harm difficulty scale: ${(game.dmgScale*100).toFixed(0)}%
      <br>heal difficulty scale: ${(game.healScale*100).toFixed(1)}%
    </div>`;
    let countGuns = 0
    let countMods = 0
    for (let i = 0, len = b.guns.length; i < len; i++) {
      if (b.guns[i].have) {
        text += `<div class="pause-grid-module"><div class="grid-title"><div class="circle-grid gun"></div> &nbsp; ${b.guns[i].name}</div> ${b.guns[i].description}</div>`
        countGuns++
      }
    }
    let el = document.getElementById("pause-grid-left")
    el.style.display = "grid"
    el.innerHTML = text

    text = "";
    text += `<div class="pause-grid-module"><div class="grid-title"><div class="circle-grid field"></div> &nbsp; ${mech.fieldUpgrades[mech.fieldMode].name}</div> ${mech.fieldUpgrades[mech.fieldMode].description}</div>`
    for (let i = 0, len = mod.mods.length; i < len; i++) {
      if (mod.mods[i].count > 0) {
        if (mod.mods[i].count === 1) {
          text += `<div class="pause-grid-module"><div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name}</div> ${mod.mods[i].description}</div>`
        } else {
          text += `<div class="pause-grid-module"><div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name} (${mod.mods[i].count}x)</div> ${mod.mods[i].description}</div>`
        }
        countMods++
      }
    }
    el = document.getElementById("pause-grid-right")
    el.style.display = "grid"
    el.innerHTML = text
    if (countMods > 5 || countGuns > 6) {
      document.body.style.overflowY = "scroll";
      document.body.style.overflowX = "hidden";
    }
  },
  unPauseGrid() {
    document.body.style.overflow = "hidden"
    document.getElementById("pause-grid-left").style.display = "none"
    document.getElementById("pause-grid-right").style.display = "none"
    window.scrollTo(0, 0);
  },
  isCustomSelection: true,
  choosePowerUp(who, index, type, isAllowed = false) {
    if (type === "gun") {
      let isDeselect = false
      for (let i = 0, len = b.inventory.length; i < len; i++) { //look for selection in inventory
        if (b.guns[b.inventory[i]].name === b.guns[index].name) { //if already clicked, remove gun
          isDeselect = true
          who.classList.remove("build-gun-selected");
          //remove gun
          b.inventory.splice(i, 1)
          b.guns[index].count = 0;
          b.guns[index].have = false;
          if (b.guns[index].ammo != Infinity) b.guns[index].ammo = 0;
          if (b.inventory.length === 0) b.activeGun = null;
          game.makeGunHUD();
          break
        }
      }
      if (!isDeselect) { //add gun
        who.classList.add("build-gun-selected");
        b.giveGuns(index)
      }
    } else if (type === "field") {
      if (mech.fieldMode !== index) {
        document.getElementById("field-" + mech.fieldMode).classList.remove("build-field-selected");
        mech.setField(index)
        who.classList.add("build-field-selected");
      }
    } else if (type === "mod") { //remove mod if you have too many
      if (mod.mods[index].count < mod.mods[index].maxCount) {
        if (!who.classList.contains("build-mod-selected")) who.classList.add("build-mod-selected");
        mod.giveMod(index)
        // if (mod.mods[index].count > 1) who.innerHTML = `<div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[index].name} (${mod.mods[index].count}x)</div> ${mod.mods[index].description}`
      } else {
        mod.removeMod(index);
        // who.innerHTML = `<div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[index].name}</div> ${mod.mods[index].description}`
        who.classList.remove("build-mod-selected");
      }
    }
    //update mod text //disable not allowed mods
    for (let i = 0, len = mod.mods.length; i < len; i++) {
      const modID = document.getElementById("mod-" + i)
      if (!mod.mods[i].isCustomHide) {
        if (mod.mods[i].allowed() || isAllowed) {
          if (mod.mods[i].count > 1) {
            modID.innerHTML = `<div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name} (${mod.mods[i].count}x)</div>${mod.mods[i].description}</div>`
          } else {
            modID.innerHTML = `<div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name}</div>${mod.mods[i].description}</div>`
          }

          if (modID.classList.contains("build-grid-disabled")) {
            modID.classList.remove("build-grid-disabled");
            modID.setAttribute("onClick", `javascript: build.choosePowerUp(this,${i},'mod')`);
          }
        } else {
          modID.innerHTML = `<div class="grid-title"><div class="circle-grid grey"></div> &nbsp; ${mod.mods[i].name}</div><span style="color:#666;"><strong>requires:</strong> ${mod.mods[i].requires}</span></div>`
          if (!modID.classList.contains("build-grid-disabled")) {
            modID.classList.add("build-grid-disabled");
            modID.onclick = null
          }
          if (mod.mods[i].count > 0) mod.removeMod(i)
          if (modID.classList.contains("build-mod-selected")) modID.classList.remove("build-mod-selected");
        }
      }
    }
  },
  populateGrid() {
    let text = `
  <div style="display: flex; justify-content: space-around; align-items: center;">
    <svg class="SVG-button" onclick="build.startBuildRun()" width="115" height="51">
      <g stroke='none' fill='#333' stroke-width="2" font-size="40px" font-family="Ariel, sans-serif">
        <text x="18" y="38">start</text>
      </g>
    </svg>
    <svg class="SVG-button" onclick="build.reset()" width="50" height="25">
      <g stroke='none' fill='#333' stroke-width="2" font-size="17px" font-family="Ariel, sans-serif">
        <text x="5" y="18">reset</text>
      </g>
    </svg>
    <svg class="SVG-button" onclick="build.shareURL()" width="52" height="25">
      <g stroke='none' fill='#333' stroke-width="2" font-size="17px" font-family="Ariel, sans-serif">
        <text x="5" y="18">share</text>
      </g>
    </svg>
  </div>
  <div style="align-items: center; text-align:center; font-size: 1.00em; line-height: 220%;background-color:var(--build-bg-color);">
    <div>starting level: <input id='starting-level' type="number" step="1" value="0" min="0" max="99"></div>
    <label for="difficulty-select" title="effects: number of mobs, damage done by mobs, damage done to mobs, mob speed, heal effects">difficulty:</label>
    <select name="difficulty-select" id="difficulty-select-custom">
      <option value="0">easy</option>
      <option value="1" selected>normal</option>
      <option value="2">hard</option>
      <option value="4">why...</option>
    </select>
  </div>`
    for (let i = 0, len = mech.fieldUpgrades.length; i < len; i++) {
      text += `<div id ="field-${i}" class="build-grid-module" onclick="build.choosePowerUp(this,${i},'field')"><div class="grid-title"><div class="circle-grid field"></div> &nbsp; ${mech.fieldUpgrades[i].name}</div> ${mech.fieldUpgrades[i].description}</div>`
    }

    for (let i = 0, len = b.guns.length; i < len; i++) {
      text += `<div id = "gun-${i}" class="build-grid-module" onclick="build.choosePowerUp(this,${i},'gun')"><div class="grid-title"><div class="circle-grid gun"></div> &nbsp; ${b.guns[i].name}</div> ${b.guns[i].description}</div>`
    }
    for (let i = 0, len = mod.mods.length; i < len; i++) {
      if (!mod.mods[i].isCustomHide) {
        if (!mod.mods[i].allowed()) { // || mod.mods[i].name === "+1 cardinality") { //|| mod.mods[i].name === "leveraged investment"
          text += `<div id="mod-${i}" class="build-grid-module build-grid-disabled"><div class="grid-title"><div class="circle-grid grey"></div> &nbsp; ${mod.mods[i].name}</div><span style="color:#666;"><strong>requires:</strong> ${mod.mods[i].requires}</span></div>`
        } else if (mod.mods[i].count > 1) {
          text += `<div id="mod-${i}" class="build-grid-module" onclick="build.choosePowerUp(this,${i},'mod')"><div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name} (${mod.mods[i].count}x)</div> ${mod.mods[i].description}</div>`
        } else {
          text += `<div id="mod-${i}" class="build-grid-module" onclick="build.choosePowerUp(this,${i},'mod')"><div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name}</div> ${mod.mods[i].description}</div>`
        }
      }
    }
    document.getElementById("build-grid").innerHTML = text
    document.getElementById("difficulty-select-custom").value = document.getElementById("difficulty-select").value
    document.getElementById("difficulty-select-custom").addEventListener("input", () => {
      game.difficultyMode = Number(document.getElementById("difficulty-select-custom").value)
      localSettings.difficultyMode = Number(document.getElementById("difficulty-select-custom").value)
      document.getElementById("difficulty-select").value = document.getElementById("difficulty-select-custom").value
      localStorage.setItem("localSettings", JSON.stringify(localSettings)); //update local storage
    });
  },
  reset() {
    build.isCustomSelection = true;
    mech.setField(0)

    b.inventory = []; //removes guns and ammo  
    for (let i = 0, len = b.guns.length; i < len; ++i) {
      b.guns[i].count = 0;
      b.guns[i].have = false;
      if (b.guns[i].ammo != Infinity) b.guns[i].ammo = 0;
    }
    b.activeGun = null;
    game.makeGunHUD();

    mod.setupAllMods();
    build.populateGrid();
    document.getElementById("field-0").classList.add("build-field-selected");
    document.getElementById("build-grid").style.display = "grid"
  },
  shareURL() {
    let url = "https://landgreen.github.io/sidescroller/index.html?"
    let count = 0;

    for (let i = 0; i < b.inventory.length; i++) {
      if (b.guns[b.inventory[i]].have) {
        url += `&gun${count}=${encodeURIComponent(b.guns[b.inventory[i]].name.trim())}`
        count++
      }
    }

    count = 0;
    for (let i = 0; i < mod.mods.length; i++) {
      for (let j = 0; j < mod.mods[i].count; j++) {
        url += `&mod${count}=${encodeURIComponent(mod.mods[i].name.trim())}`
        count++
      }
    }
    url += `&field=${encodeURIComponent(mech.fieldUpgrades[mech.fieldMode].name.trim())}`
    url += `&difficulty=${game.difficultyMode}`
    url += `&level=${Math.abs(Number(document.getElementById("starting-level").value))}`
    console.log(url)
    game.copyToClipBoard(url)
    alert('n-gon build URL copied to clipboard.\nPaste into browser address bar.')
  },
  startBuildRun() {
    build.isCustomSelection = false;
    spawn.setSpawnList(); //gives random mobs,  not starter mobs
    spawn.setSpawnList();
    if (b.inventory.length > 0) {
      b.activeGun = b.inventory[0] //set first gun to active gun
      game.makeGunHUD();
    }

    for (let i = 0; i < bullet.length; ++i) Matter.World.remove(engine.world, bullet[i]);
    bullet = []; //remove any bullets that might have spawned from mods

    const levelsCleared = Math.abs(Number(document.getElementById("starting-level").value))
    level.difficultyIncrease(Math.min(99, levelsCleared * game.difficultyMode)) //increase difficulty based on modes
    level.levelsCleared += levelsCleared;

    document.body.style.cursor = "none";
    document.body.style.overflow = "hidden"
    document.getElementById("build-grid").style.display = "none"
    game.paused = false;
    requestAnimationFrame(cycle);
  }
}

function openCustomBuildMenu() {
  game.isCheating = true;
  document.getElementById("build-button").style.display = "none";
  const el = document.getElementById("build-grid")
  el.style.display = "grid"
  document.body.style.overflowY = "scroll";
  document.body.style.overflowX = "hidden";
  document.getElementById("info").style.display = 'none'

  game.startGame(true); //starts game, but pauses it
  build.isCustomSelection = true;
  game.paused = true;
  build.reset();
}

document.getElementById("build-button").addEventListener("click", () => { //setup build run
  //record settings so they can be reproduced in the custom menu
  let field = 0;
  let inventory = [];
  let modList = [];
  if (!game.firstRun) {
    field = mech.fieldMode
    inventory = [...b.inventory]
    for (let i = 0; i < mod.mods.length; i++) {
      modList.push(mod.mods[i].count)
    }
  }

  openCustomBuildMenu();

  if (!game.firstRun) { //if player has already died once load that previous build
    // console.log(modList)
    build.choosePowerUp(document.getElementById(`field-${field}`), field, 'field')
    for (let i = 0; i < inventory.length; i++) {
      build.choosePowerUp(document.getElementById(`gun-${inventory[i]}`), inventory[i], 'gun')
    }
    for (let i = 0; i < modList.length; i++) {
      for (let j = 0; j < modList[i]; j++) {
        build.choosePowerUp(document.getElementById(`mod-${i}`), i, 'mod', true)
      }
    }
    //update mod text //disable not allowed mods  
    for (let i = 0, len = mod.mods.length; i < len; i++) {
      const modID = document.getElementById("mod-" + i)
      if (!mod.mods[i].isCustomHide) {
        if (mod.mods[i].allowed() || mod.mods[i].count > 1) {
          if (mod.mods[i].count > 1) {
            modID.innerHTML = `<div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name} (${mod.mods[i].count}x)</div>${mod.mods[i].description}</div>`
          } else {
            modID.innerHTML = `<div class="grid-title"><div class="circle-grid mod"></div> &nbsp; ${mod.mods[i].name}</div>${mod.mods[i].description}</div>`
          }
          if (modID.classList.contains("build-grid-disabled")) {
            modID.classList.remove("build-grid-disabled");
            modID.setAttribute("onClick", `javascript: build.choosePowerUp(this,${i},'mod')`);
          }
        } else {
          modID.innerHTML = `<div class="grid-title"><div class="circle-grid grey"></div> &nbsp; ${mod.mods[i].name}</div><span style="color:#666;"><strong>requires:</strong> ${mod.mods[i].requires}</span></div>`
          if (!modID.classList.contains("build-grid-disabled")) {
            modID.classList.add("build-grid-disabled");
            modID.onclick = null
          }
          // if (mod.mods[i].count > 0) mod.removeMod(i)
          // if (modID.classList.contains("build-mod-selected")) modID.classList.remove("build-mod-selected");
        }
      }
    }
  }
});


//  local storage
let localSettings = JSON.parse(localStorage.getItem("localSettings"));
// console.log(localSettings)
if (localSettings) {
  // game.isBodyDamage = localSettings.isBodyDamage
  // document.getElementById("body-damage").checked = localSettings.isBodyDamage

  game.isCommunityMaps = localSettings.isCommunityMaps
  document.getElementById("community-maps").checked = localSettings.isCommunityMaps

  game.difficultyMode = localSettings.difficultyMode
  document.getElementById("difficulty-select").value = localSettings.difficultyMode

  if (localSettings.fpsCapDefault === 'max') {
    game.fpsCapDefault = 999999999;
  } else {
    game.fpsCapDefault = Number(localSettings.fpsCapDefault)
  }
  document.getElementById("fps-select").value = localSettings.fpsCapDefault
} else {
  localSettings = {
    isCommunityMaps: false,
    difficultyMode: '1',
    fpsCapDefault: 'max',
    runCount: 0,
    levelsClearedLastGame: 0
  };
  localStorage.setItem("localSettings", JSON.stringify(localSettings)); //update local storage
  document.getElementById("community-maps").checked = localSettings.isCommunityMaps
  game.isCommunityMaps = localSettings.isCommunityMaps
  document.getElementById("difficulty-select").value = localSettings.difficultyMode
  document.getElementById("fps-select").value = localSettings.fpsCapDefault
}

//**********************************************************************
// settings 
//**********************************************************************

document.getElementById("fps-select").addEventListener("input", () => {
  let value = document.getElementById("fps-select").value
  if (value === 'max') {
    game.fpsCapDefault = 999999999;
  } else {
    game.fpsCapDefault = Number(value)
  }
  localSettings.fpsCapDefault = value
  localStorage.setItem("localSettings", JSON.stringify(localSettings)); //update local storage
});

document.getElementById("community-maps").addEventListener("input", () => {
  game.isCommunityMaps = document.getElementById("community-maps").checked
  localSettings.isCommunityMaps = game.isCommunityMaps
  localStorage.setItem("localSettings", JSON.stringify(localSettings)); //update local storage
});

// difficulty-select-custom event listener is set in build.makeGrid
document.getElementById("difficulty-select").addEventListener("input", () => {
  game.difficultyMode = Number(document.getElementById("difficulty-select").value)
  localSettings.difficultyMode = game.difficultyMode
  localSettings.levelsClearedLastGame = 0 //after changing difficulty, reset run history
  localStorage.setItem("localSettings", JSON.stringify(localSettings)); //update local storage
});

// ************************************************************************************************
// ************************************************************************************************
// inputs
// ************************************************************************************************
// ************************************************************************************************

const input = {
  up: false, // jump
  down: false, // crouch
  left: false,
  right: false,
  field: false, // right mouse
  fire: false, // left mouse
  isPauseKeyReady: true,
}
//mouse move input
document.body.addEventListener("mousemove", (e) => {
  game.mouse.x = e.clientX;
  game.mouse.y = e.clientY;
});

document.body.addEventListener("mouseup", (e) => {
  // input.fire = false;
  // console.log(e)
  if (e.which === 3) {
    input.field = false;
  } else {
    input.fire = false;
  }
});

document.body.addEventListener("mousedown", (e) => {
  if (e.which === 3) {
    input.field = true;
  } else {
    input.fire = true;
  }
});

document.body.addEventListener("mouseenter", (e) => { //prevents mouse getting stuck when leaving the window
  if (e.button === 1) {
    input.fire = true;
  } else {
    input.fire = false;
  }

  if (e.button === 3) {
    input.field = true;
  } else {
    input.field = false;
  }
});
document.body.addEventListener("mouseleave", (e) => { //prevents mouse getting stuck when leaving the window
  if (e.button === 1) {
    input.fire = true;
  } else {
    input.fire = false;
  }

  if (e.button === 3) {
    input.field = true;
  } else {
    input.field = false;
  }
});

document.body.addEventListener("wheel", (e) => {
  if (!game.paused) {
    if (e.deltaY > 0) {
      game.nextGun();
    } else {
      game.previousGun();
    }
  }
}, {
  passive: true
});

window.addEventListener("keydown", function (event) {
  // if (event.defaultPrevented) {
  //   return; // Do nothing if the event was already processed
  // }
  switch (event.key) {
    case "d":
    case "ArrowRight":
      input.right = true
      break;
    case "a":
    case "ArrowLeft":
      input.left = true
      break;
    case "w":
    case "ArrowUp":
      input.up = true
      break;
    case "s":
    case "ArrowDown":
      input.down = true
      break;
    case "e":
      game.nextGun();
      break
    case "q":
      game.previousGun();
      break
    case "p":
      if (!game.isChoosing && input.isPauseKeyReady) {
        input.isPauseKeyReady = false
        setTimeout(function () {
          input.isPauseKeyReady = true
        }, 300);
        if (game.paused) {
          build.unPauseGrid()
          game.paused = false;
          level.levelAnnounce();
          document.body.style.cursor = "none";
          requestAnimationFrame(cycle);
        } else {
          game.paused = true;
          game.replaceTextLog = true;
          build.pauseGrid()
          document.body.style.cursor = "auto";
        }
      }
      break
    case "t":
      if (game.testing) {
        game.testing = false;
        game.loop = game.normalLoop
        if (game.isConstructionMode) {
          document.getElementById("construct").style.display = 'none'
        }
      } else { //if (keys[191])
        game.testing = true;
        game.isCheating = true;
        if (game.isConstructionMode) {
          document.getElementById("construct").style.display = 'inline'
        }
        game.loop = game.testingLoop
      }
      break
  }
  if (game.testing) {
    switch (event.key) {
      case "o":
        game.isAutoZoom = false;
        game.zoomScale /= 0.9;
        game.setZoom();
        break;
      case "i":
        game.isAutoZoom = false;
        game.zoomScale *= 0.9;
        game.setZoom();
        break
      case "`":
        powerUps.directSpawn(game.mouseInGame.x, game.mouseInGame.y, "reroll");
        break
      case "1":
        powerUps.directSpawn(game.mouseInGame.x, game.mouseInGame.y, "heal");
        break
      case "2":
        powerUps.directSpawn(game.mouseInGame.x, game.mouseInGame.y, "ammo");
        break
      case "3":
        powerUps.directSpawn(game.mouseInGame.x, game.mouseInGame.y, "gun");
        break
      case "4":
        powerUps.directSpawn(game.mouseInGame.x, game.mouseInGame.y, "field");
        break
      case "5":
        powerUps.directSpawn(game.mouseInGame.x, game.mouseInGame.y, "mod");
        break
      case "6":
        const pick = spawn.fullPickList[Math.floor(Math.random() * spawn.fullPickList.length)];
        spawn[pick](game.mouseInGame.x, game.mouseInGame.y);
        break
      case "7":
        const index = body.length
        spawn.bodyRect(game.mouseInGame.x, game.mouseInGame.y, 50, 50);
        body[index].collisionFilter.category = cat.body;
        body[index].collisionFilter.mask = cat.player | cat.map | cat.body | cat.bullet | cat.mob | cat.mobBullet
        body[index].classType = "body";
        World.add(engine.world, body[index]); //add to world
        break
      case "f":
        const mode = (mech.fieldMode === mech.fieldUpgrades.length - 1) ? 0 : mech.fieldMode + 1
        mech.setField(mode)
        break
      case "g":
        b.giveGuns("all", 1000)
        break
      case "h":
        mech.addHealth(Infinity)
        mech.energy = mech.maxEnergy;
        break
      case "y":
        mod.giveMod()
        break
      case "r":
        Matter.Body.setPosition(player, game.mouseInGame);
        Matter.Body.setVelocity(player, {
          x: 0,
          y: 0
        });
        // move bots to follow player
        for (let i = 0; i < bullet.length; i++) {
          if (bullet[i].botType) {
            Matter.Body.setPosition(bullet[i], Vector.add(player.position, {
              x: 250 * (Math.random() - 0.5),
              y: 250 * (Math.random() - 0.5)
            }));
            Matter.Body.setVelocity(bullet[i], {
              x: 0,
              y: 0
            });
          }
        }
        break
      case "u":
        level.nextLevel();
        break
      case "X": //capital X to make it hard to die
        mech.death();
        break
    }
  }
  // event.preventDefault(); // Cancel the default action to avoid it being handled twice
}, true);

window.addEventListener("keyup", function (event) {
  // if (event.defaultPrevented) {
  //   return; // Do nothing if the event was already processed
  // }
  switch (event.key) {
    case "d":
    case "ArrowRight":
      input.right = false
      break;
    case "a":
    case "ArrowLeft":
      input.left = false
      break;
    case "w":
    case "ArrowUp":
      input.up = false
      break;
    case "s":
    case "ArrowDown":
      input.down = false
      break;
  }
  // event.preventDefault(); // Cancel the default action to avoid it being handled twice
}, true);

//**********************************************************************
// main loop 
//**********************************************************************
game.loop = game.normalLoop;

function cycle() {
  if (!game.paused) requestAnimationFrame(cycle);
  const now = Date.now();
  const elapsed = now - game.then; // calc elapsed time since last loop
  if (elapsed > game.fpsInterval) { // if enough time has elapsed, draw the next frame
    game.then = now - (elapsed % game.fpsInterval); // Get ready for next frame by setting then=now.   Also, adjust for fpsInterval not being multiple of 16.67

    game.cycle++; //tracks game cycles
    mech.cycle++; //tracks player cycles  //used to alow time to stop for everything, but the player
    if (game.clearNow) {
      game.clearNow = false;
      game.clearMap();
      level.start();
    }

    game.loop();
    // if (isNaN(mech.health) || isNaN(mech.energy)) {
    //   console.log(`mech.health = ${mech.health}`)
    //   game.paused = true;
    //   game.replaceTextLog = true;
    //   build.pauseGrid()
    //   document.body.style.cursor = "auto";
    //   alert("health is NaN, please report this bug to the discord  \n https://discordapp.com/invite/2eC9pgJ")
    // }
    // for (let i = 0, len = loop.length; i < len; i++) {
    //   loop[i]()
    // }
  }
}