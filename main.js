const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function scale(){
 let g=document.getElementById("game");
 let s=Math.min(window.innerWidth/1920,window.innerHeight/1080);
 g.style.transform=`scale(${s})`;
 g.style.left=(window.innerWidth-1920*s)/2+"px";
 g.style.top=(window.innerHeight-1080*s)/2+"px";
}
window.addEventListener("resize",scale);
scale();

Progression.load();
if(typeof Game !== "undefined" && Game.loadArenaBackground){
 Game.loadArenaBackground();
}
Scene.set("MainMenu");

function loop(){
 Scene.update();
 Scene.draw();
 requestAnimationFrame(loop);
}
loop();