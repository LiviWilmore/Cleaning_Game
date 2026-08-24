import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let isScratching = false;
let lastBrushX = null;
let lastBrushY = null;
let strokeProgress = 0;

let video;
let handPose;
let hands = [];

const scrubSound = new Audio("audio/scrub.mp3");

scrubSound.loop = true;
scrubSound.volume = 0.5;

let wristCursor = document.createElement("div");

wristCursor.style.position = "fixed";
wristCursor.style.width = "30px";
wristCursor.style.height = "30px";
wristCursor.style.borderRadius = "50%";
wristCursor.style.backgroundColor = "red";
wristCursor.style.pointerEvents = "none";
wristCursor.style.zIndex = "9999";

document.body.appendChild(wristCursor);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);


const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(0, 0, 4);

//TEXT ANIMATION
const overlayTexts = [
    "This is the 1st bit of text",
    "This is the 2nd bit of text",
    "This is the 3rd bit of text",
    "This is the 4th bit of text"
];

let overlayIndex = 0;

const textOverlay =
    document.getElementById("textOverlay");

setInterval(() => {

    overlayIndex++;

    if (overlayIndex >= overlayTexts.length) {
        overlayIndex = 0;
    }

    textOverlay.textContent =
        overlayTexts[overlayIndex];

}, 4000);





const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);

renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";
renderer.domElement.style.zIndex = "1";

document.body.appendChild(renderer.domElement);

//TEXTURES

const textureLoader = new THREE.TextureLoader();

//APPLE 


//RAYCASTERRERRRR
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


//SCRATCH MASK
const maskCanvas = document.createElement("canvas");

maskCanvas.width = 1024;
maskCanvas.height = 1024;

const maskContext = maskCanvas.getContext("2d");

maskContext.fillStyle = "black";
maskContext.fillRect(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height
);




const maskTexture = new THREE.CanvasTexture(maskCanvas);

maskTexture.needsUpdate = true;



function nextObject() {

    console.log(
        "Object cleaned 95%!"
    );


    currentObjectIndex++;


    if (
        currentObjectIndex >=
        objects.length
    ) {

        currentObjectIndex = 0;

    }


    loadNextObject();

}


let objectChanging = false;

function checkCleanPercentage() {

    if (objectChanging) return;

    const cleanPercentage =
        getCleanPercentage();

    if (cleanPercentage >=30) {

        objectChanging = true;

        nextObject();

    }

}

//LIGHTS

scene.add(new THREE.AmbientLight(0xffffff, 1));

const light = new THREE.DirectionalLight(0xffffff, 3);

light.position.set(5, 5, 5);

scene.add(light);


//ESTABLISH OBJECTS


let currentObject = null;

let currentObjectIndex = 0;

const objects = [
    {
        name: "Apple",
        model: "models/apple.glb",
        cleanTexture: "textures/apple.png",
        dirtTexture: "textures/dirt.png",
        scale: 0.02,
        cleanFlipX: false,
        cleanFlipY: false,
        dirtFlipX: false,
        dirtFlipY: false
    },
    
    {
    name: "Banana",
    model: "models/banana.glb",
    cleanTexture: "textures/banana.png",
    dirtTexture: "textures/bananadirt.png",
    scale: 1,
    cleanFlipX: false,
    cleanFlipY: true,
    dirtFlipX: false,
    dirtFlipY: false
}
];


//LOAD OBJECTS

const loader = new GLTFLoader();

function loadNextObject() {

    if (currentObject) {

        scene.remove(currentObject);

        currentObject = null;

    }

    const objectData =
        objects[currentObjectIndex];

        const cleanTexture =
    textureLoader.load(
        objectData.cleanTexture
    );

 cleanTexture.flipY = false;


 const dirtTexture =
    textureLoader.load(
        objectData.dirtTexture
    );

 dirtTexture.flipY = false;

    console.log(
        "Loading object:",
        objectData.name
    );

    resetMask();

    loader.load(

        objectData.model,

        (gltf) => {

            currentObject =
                gltf.scene;

            currentObject.scale.set(
                objectData.scale,
                objectData.scale,
                objectData.scale
            );

            currentObject.traverse(
                (child) => {

                    if (child.isMesh) {

                         child.material =
   function createDirtMaterial(
    cleanTexture,
    dirtTexture,
    cleanFlipX,
    cleanFlipY,
    dirtFlipX,
    dirtFlipY
) {

    return new THREE.ShaderMaterial({

        uniforms: {

            cleanMap: {
                value: cleanTexture
            },

            dirtMap: {
                value: dirtTexture
            },

            maskMap: {
                value: maskTexture
            },

            cleanFlipX: {
                value: cleanFlipX
            },

            cleanFlipY: {
                value: cleanFlipY
            },

            dirtFlipX: {
                value: dirtFlipX
            },

            dirtFlipY: {
                value: dirtFlipY
            }

        },

        vertexShader: `

            varying vec2 vUv;

            void main() {

                vUv = uv;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);

            }

        `,

        fragmentShader: `

            uniform sampler2D cleanMap;
            uniform sampler2D dirtMap;
            uniform sampler2D maskMap;

            uniform bool cleanFlipX;
            uniform bool cleanFlipY;

            uniform bool dirtFlipX;
            uniform bool dirtFlipY;

            varying vec2 vUv;


            void main() {

                // ==========================================
                // CLEAN TEXTURE UV
                // ==========================================

                vec2 cleanUV = vUv;

                if (cleanFlipX) {
                    cleanUV.x = 1.0 - cleanUV.x;
                }

                if (cleanFlipY) {
                    cleanUV.y = 1.0 - cleanUV.y;
                }


                // ==========================================
                // DIRT TEXTURE UV
                // ==========================================

                vec2 dirtUV = vUv;

                if (dirtFlipX) {
                    dirtUV.x = 1.0 - dirtUV.x;
                }

                if (dirtFlipY) {
                    dirtUV.y = 1.0 - dirtUV.y;
                }


                // ==========================================
                // TEXTURES
                // ==========================================

                vec4 clean =
                    texture2D(
                        cleanMap,
                        cleanUV
                    );

                vec4 dirt =
                    texture2D(
                        dirtMap,
                        dirtUV
                    );


                // ==========================================
                // MASK
                // ==========================================

                float mask =
                    texture2D(
                        maskMap,
                        vUv
                    ).r;


                // ==========================================
                // GOO EDGE
                // ==========================================

                // Size of neighbouring UV samples.

                vec2 pixelSize =
                    vec2(
                        1.0 / 1024.0,
                        1.0 / 1024.0
                    );


                float maskLeft =
                    texture2D(
                        maskMap,
                        vUv + vec2(-pixelSize.x, 0.0)
                    ).r;

                float maskRight =
                    texture2D(
                        maskMap,
                        vUv + vec2(pixelSize.x, 0.0)
                    ).r;

                float maskUp =
                    texture2D(
                        maskMap,
                        vUv + vec2(0.0, pixelSize.y)
                    ).r;

                float maskDown =
                    texture2D(
                        maskMap,
                        vUv + vec2(0.0, -pixelSize.y)
                    ).r;


                // Detect the boundary between
                // dirty and clean.

                float edge =
                    abs(maskLeft - maskRight) +
                    abs(maskUp - maskDown);


                edge =
                    smoothstep(
                        0.05,
                        0.5,
                        edge
                    );


                // ==========================================
                // WET GOO
                // ==========================================

                vec3 gooColor =
                    dirt.rgb;


                // Make the dirt slightly richer/darker.

                gooColor *= 0.85;


                // ==========================================
                // FAKE GLOSSY HIGHLIGHT
                // ==========================================

                float highlight =
                    pow(
                        max(
                            0.0,
                            1.0 -
                            distance(
                                vUv,
                                vec2(0.5)
                            ) * 1.5
                        ),
                        6.0
                    );


                gooColor +=
                    highlight * 0.20;


                // ==========================================
                // GOO EDGE HIGHLIGHT
                // ==========================================

                gooColor +=
                    edge * 0.25;


                // ==========================================
                // GOO EDGE SHADOW
                // ==========================================

                gooColor *=
                    1.0 - edge * 0.15;


                // ==========================================
                // MIX DIRT AND CLEAN
                // ==========================================

                vec3 finalColor =
                    mix(
                        gooColor,
                        clean.rgb,
                        mask
                    );


                gl_FragColor =
                    vec4(
                        finalColor,
                        1.0
                    );

            }

        `

    });

}

                    }

                }
            );

            scene.add(
                currentObject
            );

            objectChanging = false;

            console.log(
                objectData.name,
                "loaded!"
            );

        },

        undefined,

        (err) => {

            console.error(
                "Error loading",
                objectData.name,
                err
            );

            objectChanging = false;

        }

    );

}


function resetMask() {

    maskContext.globalCompositeOperation =
        "source-over";


    maskContext.fillStyle =
        "black";


    maskContext.fillRect(
        0,
        0,
        maskCanvas.width,
        maskCanvas.height
    );


    maskTexture.needsUpdate = true;



    lastBrushX = null;
    lastBrushY = null;

    strokeProgress = 0;

}

loadNextObject();

function animate() {

    requestAnimationFrame(animate);

    if (currentObject) {
        currentObject.rotation.y += 0.001;
        currentObject.rotation.x += 0.001;
        currentObject.rotation.z += 0.001;

    }

    renderer.render(scene, camera);

}

animate();


window.addEventListener("resize", () => {

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

});


//TRACK MOUSE
window.addEventListener("pointermove", (event) => {

    mouse.x =
        (event.clientX / window.innerWidth) * 2 - 1;

    mouse.y =
        -(event.clientY / window.innerHeight) * 2 + 1;

});


// MATERIAL

function createDirtMaterial(
    cleanTexture,
    dirtTexture,
    cleanFlipX,
    cleanFlipY,
    dirtFlipX,
    dirtFlipY
) {

    return new THREE.ShaderMaterial({

        uniforms: {

            cleanMap: {
                value: cleanTexture
            },

            dirtMap: {
                value: dirtTexture
            },

            maskMap: {
                value: maskTexture
            },

            cleanFlipX: {
                value: cleanFlipX
            },

            cleanFlipY: {
                value: cleanFlipY
            },

            dirtFlipX: {
                value: dirtFlipX
            },

            dirtFlipY: {
                value: dirtFlipY
            }

        },

        vertexShader: `

            varying vec2 vUv;

            void main() {

                vUv = uv;

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);

            }

        `,

        fragmentShader: `

            uniform sampler2D cleanMap;
            uniform sampler2D dirtMap;
            uniform sampler2D maskMap;

            uniform bool cleanFlipX;
            uniform bool cleanFlipY;

            uniform bool dirtFlipX;
            uniform bool dirtFlipY;

            varying vec2 vUv;

            void main() {

                // -------------------------
                // CLEAN TEXTURE UV
                // -------------------------

                vec2 cleanUV = vUv;

                if (cleanFlipX) {
                    cleanUV.x = 1.0 - cleanUV.x;
                }

                if (cleanFlipY) {
                    cleanUV.y = 1.0 - cleanUV.y;
                }


                // -------------------------
                // DIRT TEXTURE UV
                // -------------------------

                vec2 dirtUV = vUv;

                if (dirtFlipX) {
                    dirtUV.x = 1.0 - dirtUV.x;
                }

                if (dirtFlipY) {
                    dirtUV.y = 1.0 - dirtUV.y;
                }


                // -------------------------
                // SAMPLE TEXTURES
                // -------------------------

                vec4 clean =
                    texture2D(
                        cleanMap,
                        cleanUV
                    );

                vec4 dirt =
                    texture2D(
                        dirtMap,
                        dirtUV
                    );


                // -------------------------
                // SCRATCH MASK
                // -------------------------

                float mask =
                    texture2D(
                        maskMap,
                        vUv
                    ).r;


                // -------------------------
                // MIX DIRT + CLEAN
                // -------------------------

                gl_FragColor =
                    mix(
                        dirt,
                        clean,
                        mask
                    );

            }

        `

    });

}


//PAINTBRUSH

const brushImage = new Image();

brushImage.src = "textures/brush.png";


function paintBrush(x, y, size) {

    maskContext.globalCompositeOperation =
        "lighter";

    maskContext.drawImage(
        brushImage,
        x - size / 2,
        y - size / 2,
        size,
        size
    );

    maskContext.globalCompositeOperation =
        "source-over";

    maskTexture.needsUpdate = true;

}


window.addEventListener("pointerdown", () => {

    isScratching = true;
    strokeProgress = 0;

});


window.addEventListener("pointerup", () => {

    isScratching = false;

});

//MOUSE RUB
/*
window.addEventListener("pointermove", () => {

    if (!isScratching || !currentObject) return;

    raycaster.setFromCamera(
        mouse,
        camera
    );

    const hits =
        raycaster.intersectObject(
            currentObject,
            true
        );

    if (hits.length > 0) {

        const uv = hits[0].uv;

        strokeProgress += 0.05;

        let taper = Math.min(
            strokeProgress,
            1
        );

        let brushSize =
            20 + taper * 40; //BRUSH SIZE

        drawInterpolatedBrush(
            uv.x * 1024,
            (1 - uv.y) * 1024,
            brushSize
        );

    }

});
*/

function lerp(a, b, t) {

    return a + (b - a) * t;

}


//INTERPOLATE BRUSH

function drawInterpolatedBrush(x, y, size) {

    if (lastBrushX === null) {

        paintBrush(
            x,
            y,
            size
        );

    } else {

        const distance =
            Math.hypot(
                x - lastBrushX,
                y - lastBrushY
            );

        const spacing =
            size * 0.25;

        const steps =
            Math.ceil(
                distance / spacing
            );

        for (let i = 1; i <= steps; i++) {

            const t =
                i / steps;

            const ix =
                lerp(
                    lastBrushX,
                    x,
                    t
                );

            const iy =
                lerp(
                    lastBrushY,
                    y,
                    t
                );

            paintBrush(
                ix,
                iy,
                size
            );

        }

    }

    lastBrushX = x;
    lastBrushY = y;

}

function getCleanPercentage() {

    const imageData =
        maskContext.getImageData(
            0,
            0,
            maskCanvas.width,
            maskCanvas.height
        );


    const pixels =
        imageData.data;


    let cleanPixels = 0;

    const totalPixels =
        maskCanvas.width *
        maskCanvas.height;


    for (
        let i = 0;
        i < pixels.length;
        i += 4
    ) {

        if (pixels[i] > 200) {

            cleanPixels++;

        }

    }


    return (
        cleanPixels /
        totalPixels
    ) * 100;

}


//RESET STROKE WHEN STOP CLICK

window.addEventListener("pointerup", () => {

    isScratching = false;

    lastBrushX = null;
    lastBrushY = null;

    strokeProgress = 0;

});


// SETUP WEBCAM AND HANDPOSE

async function setupHandTracking() {

    console.log("1. Requesting camera...");

    const stream =
        await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: "user"
            },
            audio: false
        });

    console.log("2. Camera stream received");


    // CREATE VIDEO

    video = document.createElement("video");

    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;

    video.width = 640;
    video.height = 480;

    video.style = "none"

    //video.style.position = "fixed";
    // video.style.width = "320px";
    //video.style.height = "240px";
    //video.style.left = "20px";
    //video.style.top = "20px";
    // video.style.zIndex = "99999";

    document.body.appendChild(video);


    video.srcObject = stream;


    await new Promise(resolve => {

        video.onloadedmetadata = resolve;

    });


    await video.play();


    console.log(
        "3. VIDEO:",
        video.videoWidth,
        video.videoHeight,
        "readyState:",
        video.readyState,
        "paused:",
        video.paused
    );


    // WAIT FOR VIDEO FRAMES

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );


    console.log(
        "4. VIDEO CURRENT TIME:",
        video.currentTime
    );


    // HAND MODEL

    console.log(
        "5. Loading HandPose..."
    );


    handPose =
        await ml5.handPose({
            maxHands: 2
        });


    console.log(
        "6. HandPose loaded:",
        handPose
    );


    console.log(
        "7. Starting detection..."
    );


    handPose.detectStart(
        video,

        (results) => {

        

            gotHands(results);

        }
    );

}


setupHandTracking();


//GET WRIST

function gotHands(results) {

    hands = results;


    if (hands.length === 0) {

    wristCursor.style.display = "none";

    lastBrushX = null;
    lastBrushY = null;

    scrubSound.pause();
    scrubSound.currentTime = 0;

    return;

    }


    const hand =
        hands[0];


    const wrist =
        hand.keypoints[0];


    // UPDATE WRIST CURSOR

    const screen =
        wristToScreen(wrist);


    wristCursor.style.display =
        "block";


    wristCursor.style.left =
        (screen.x - 15) + "px";


    wristCursor.style.top =
        (screen.y - 15) + "px";


    // RAYCAST

    if (!currentObject) return;


    const hits =
        raycastFromWrist(wrist);


    // CHECK APPLE + GET UV

   if (hits.length > 0) {

    wristCursor.style.backgroundColor =
        "limegreen";

        scrubSound.play().catch(() => {});

    const uv =
        hits[0].uv;

    //console.log(
    //    "UV:",
    //   uv.x,
    //  uv.y
    //);


    // CONVERT APPLE UV TO MASK COORDINATES

    const maskX =
        uv.x * maskCanvas.width;

    const maskY =
        (1 - uv.y) * maskCanvas.height;


    // DRAW BRUSH

    drawInterpolatedBrush(
        maskX,
        maskY,
        80
    );

    checkCleanPercentage();


} else {

    wristCursor.style.backgroundColor =
        "red";

    scrubSound.pause();
    scrubSound.currentTime = 0;

    // RESET BRUSH POSITION WHEN
    // HAND IS NOT OVER APPLE

    lastBrushX = null;
    lastBrushY = null;

}

}


//WRIST TO SCREEN

function wristToScreen(wrist) {

    const screenX =
        (1 - wrist.x / video.videoWidth) *
        // 1 - to FLIP CAM
        window.innerWidth;


    const screenY =
        (wrist.y / video.videoHeight) *
        window.innerHeight;


    return {

        x: screenX,
        y: screenY

    };

}


function raycastFromWrist(wrist) {

    const screen =
        wristToScreen(wrist);


    mouse.x =
        (screen.x / window.innerWidth) * 2 - 1;


    mouse.y =
        -(screen.y / window.innerHeight) * 2 + 1;


    raycaster.setFromCamera(
        mouse,
        camera
    );


    const hits =
        raycaster.intersectObject(
            currentObject,
            true
        );


    return hits;

}
