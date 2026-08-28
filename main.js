
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

// CLEANING SETTINGS

const CLEANING_VOLUME_SIZE = 128;
const CLEANING_RADIUS = 7;

// GOO APPEARANCE

const GOO_COLOUR = 0x3fa800;

const GOO_ROUGHNESS = 0.11;
const GOO_METALNESS = 0.0;

const GOO_CLEARCOAT = 0.82;
const GOO_CLEARCOAT_ROUGHNESS = 0.035;

const GOO_SPECULAR_INTENSITY = 1.0;

const GOO_EDGE_SAMPLE = 0.65;


// Width of the visual clean-side shoulder.
const GOO_BEVEL_WIDTH = 1;


// Strength of the normal bend.
const GOO_BEVEL_STRENGTH = -0.7;


// Clean-side bevel profile.
const GOO_BEVEL_CLEAN_START = 0.15;
const GOO_BEVEL_CLEAN_PEAK = 0.40;
const GOO_BEVEL_CLEAN_END = 1.2;


// Small actual displacement.
const GOO_DISPLACEMENT = 0.008;


// GOO EDGE COLOUR

const GOO_EDGE_DARKNESS = 0.035;
const GOO_EDGE_HIGHLIGHT = 0.12;


// HDRI

const HDRI_PATH = "textures/studio.hdr";


let isScratching = false;

let strokeProgress = 0;

let lastBrushX = null;
let lastBrushY = null;


// HAND TRACKING


let video = null;
let handPose = null;
let hands = [];


// CLEANING VOLUME


let cleaningVolume = null;
let cleaningVolumeTexture = null;

let cleaningVolumeBounds = new THREE.Box3();

let cleaningVolumeSize =
    CLEANING_VOLUME_SIZE;

let cleaningVolumeData = null;

let lastCleaningLocalPoint = null;


// HDRI STATE

let gooEnvironment = null;
let hdrReady = false;


// SCRUB SOUND

const scrubSound =
    new Audio("audio/scrub.mp3");

scrubSound.loop = true;
scrubSound.volume = 0.5;

// DING SOUND
const dingSound =
    new Audio("audio/ding.mp3");

dingSound.volume = 0.5;

// WRIST CURSOR

const wristCursor =
    document.createElement("div");

wristCursor.style.position = "fixed";

wristCursor.style.width = "80px";
wristCursor.style.height = "80px";

wristCursor.style.backgroundImage =
    "url('textures/sponge.png')";

wristCursor.style.backgroundSize =
    "contain";

wristCursor.style.backgroundRepeat =
    "no-repeat";

wristCursor.style.backgroundPosition =
    "center";

wristCursor.style.pointerEvents =
    "none";

wristCursor.style.zIndex =
    "9999";

wristCursor.style.display =
    "none";

document.body.appendChild(
    wristCursor
);

//INITIAL LOADERS

const textureLoader =
    new THREE.TextureLoader();

const loader =
    new GLTFLoader();

// SCENE

const scene =
    new THREE.Scene();

const backgroundTextureLoader =
    new THREE.TextureLoader();

const backgroundTexture =
    backgroundTextureLoader.load(

        "textures/cloud_bg.jpg", );


// Background images are normal colour images,
// so they should use sRGB colour space.

backgroundTexture.colorSpace =
    THREE.SRGBColorSpace;


// Keep the background from being affected by
// the scene's lighting or goo shader.

backgroundTexture.minFilter =
    THREE.LinearFilter;

backgroundTexture.magFilter =
    THREE.LinearFilter;

backgroundTexture.wrapS =
    THREE.ClampToEdgeWrapping;

backgroundTexture.wrapT =
    THREE.ClampToEdgeWrapping;


// Install the image as the scene background.

scene.background =
    backgroundTexture;


// CAMERA

const camera =
    new THREE.PerspectiveCamera(

        45,

        window.innerWidth /
        window.innerHeight,

        0.1,

        100

    );

camera.position.set(
    0,
    0,
    4
);


// TEXT ANIMATION

const overlayTexts = [

    "In this padded cell I am protected,",

    "The bevel a buffer between me, and the anxieties of true cognition",

    "These colours subsume me",

    "These sounds itch me",

    "I squidge, I click",

    "I fill my time",

    "I reach nirvana",

    "I am a fractal explorer,",

    "I journey to all four corner of this oasis to earn my keep",

    "Manufactured perimeters",

    "No moment wasted.",

    "Anything but stillness.",

    "Here my goals are attainable",

    "My reward pathways organised",

    "So,",

    "I allow for stimulated paralysis",

    "My mind moves so fast but my vessel … so gaunt :(",

    "Why is my body punishing me?",

    "Or is it telling me its craving more",

    "My eyes throb when I look away,",

    "I receive the circles of shame",

    "On my knees",

    "when I am moved from my position.",

    "Mind and body unite",

    "I beg, You have to understand",

    "I’m sooo satisfied."

];

let overlayIndex = 0;

const textOverlay =
    document.getElementById("textOverlay");

const textOutline =
    document.getElementById("textOutline");

setInterval(() => {

    overlayIndex++;

    if (
        overlayIndex >=
        overlayTexts.length
    ) {

        overlayIndex = 0;

    }

    const text =
        overlayTexts[overlayIndex];

    if (textOverlay) {
        textOverlay.textContent = text;
    }

    if (textOutline) {
        textOutline.textContent = text;
    }

}, 4000);


// RENDERER

const renderer =
    new THREE.WebGLRenderer({

        antialias: true,
        alpha: false

    });

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);


// COLOUR MANAGEMENT

renderer.outputColorSpace =
    THREE.SRGBColorSpace;

renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure =
    1.0;


renderer.domElement.style.position =
    "fixed";

renderer.domElement.style.top =
    "0";

renderer.domElement.style.left =
    "0";

renderer.domElement.style.zIndex =
    "1";

document.body.appendChild(
    renderer.domElement
);


if (
    !renderer.capabilities.isWebGL2
) {

    console.error(
        "This cleaning system requires WebGL2."
    );

}


// HDRI / PMREM

const pmremGenerator =
    new THREE.PMREMGenerator(
        renderer
    );

pmremGenerator.compileEquirectangularShader();

const rgbeLoader =
    new RGBELoader();


rgbeLoader.load(

    HDRI_PATH,

    (hdrTexture) => {

        console.log(
            "HDRI loaded:",
            HDRI_PATH
        );


        const pmremTarget =
            pmremGenerator.fromEquirectangular(
                hdrTexture
            );


        gooEnvironment =
            pmremTarget.texture;


        scene.environment =
            gooEnvironment;


        hdrReady = true;


        hdrTexture.dispose();

        pmremGenerator.dispose();


        console.log(
            "PMREM HDRI environment installed."
        );

    },

    undefined,

    (error) => {

        console.warn(
            "HDRI could not be loaded:",
            HDRI_PATH,
            error
        );

    }

);


// LIGHTING

scene.add(

    new THREE.HemisphereLight(

        0xffffff,
        0x303030,
        1.25

    )

);


const keyLight =
    new THREE.DirectionalLight(
        0xffffff,
        1.1
    );

keyLight.position.set(
    4,
    6,
    5
);

scene.add(keyLight);


const fillLight =
    new THREE.DirectionalLight(
        0xffffff,
        0.32
    );

fillLight.position.set(
    -4,
    1,
    3
);

scene.add(fillLight);


// LOADERS



const raycaster =
    new THREE.Raycaster();

const mouse =
    new THREE.Vector2();


let currentObject = null;
let currentObjectIndex = 0;
let objectChanging = false;


// OBJECTS

const objects = [

    {

        name: "Apple",

        model: "models/Apple_Core.glb",

        cleanTexture: "textures/Core.jpg",

        scale: 0.02,

        cleanFlipX: false,

        cleanFlipY: false,

        gooColor: GOO_COLOUR,

        cleanPercentage: 11,

        position: 10,

    },


    {

        name: "Plug_Socket",

        model: "models/Plug_Socket.glb",

        cleanTexture: "textures/Plug_Socket.jpg",

        scale: 0.02,

        cleanFlipX: false,

        cleanFlipY: true,

        gooColor: GOO_COLOUR,

        cleanPercentage: 13,

        position: 10,

    },

    {

        name: "Screw",

        model: "models/Screw.glb",

        cleanTexture: "textures/Screw_Metal.jpg",

        metalnessTexture: "textures/Screw_Metal.jpg",

        scale: 0.02,

        cleanFlipX: false,

        cleanFlipY: true,

        gooColor: GOO_COLOUR,

        cleanPercentage: 7.5,

        position: 10,

    },

    {

        name: "Fish_Bone",

        model: "models/Fish_Bone.glb",

        cleanTexture: "textures/Bone.jpg",

        scale: 0.02,

        cleanFlipX: false,

        cleanFlipY: true,

        gooColor: GOO_COLOUR,

        cleanPercentage: 7,

        position: 10,

    },

    {

        name: "Button",

        model: "models/Button.glb",

        cleanTexture: "textures/Button.jpg",

        scale: 0.02,

        cleanFlipX: false,

        cleanFlipY: true,

        gooColor: GOO_COLOUR,

        cleanPercentage: 11,

        position: 10,

    },

];


// NEXT OBJECT

function nextObject() {

    console.log(
        "Object Cleaned!"
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


// CLEAN PERCENTAGE

function checkCleanPercentage() {

    if (
        objectChanging ||
        !currentObject
    ) {

        return;

    }


    const cleanPercentage =
        getCleanPercentage();


    const objectData =
        objects[currentObjectIndex];


    const requiredCleanPercentage =
        objectData.cleanPercentage;


    if (
        cleanPercentage >=
        requiredCleanPercentage
    ) {

        objectChanging = true;

        nextObject();

    }

}


// CREATE CLEANING VOLUME

function createCleaningVolume() {

    const totalVoxels =
        cleaningVolumeSize *
        cleaningVolumeSize *
        cleaningVolumeSize;


    cleaningVolumeData =
        new Uint8Array(
            totalVoxels
        );


    cleaningVolumeTexture =
        new THREE.Data3DTexture(

            cleaningVolumeData,

            cleaningVolumeSize,

            cleaningVolumeSize,

            cleaningVolumeSize

        );


    cleaningVolumeTexture.format =
        THREE.RedFormat;

    cleaningVolumeTexture.type =
        THREE.UnsignedByteType;

    cleaningVolumeTexture.minFilter =
        THREE.LinearFilter;

    cleaningVolumeTexture.magFilter =
        THREE.LinearFilter;

    cleaningVolumeTexture.wrapS =
        THREE.ClampToEdgeWrapping;

    cleaningVolumeTexture.wrapT =
        THREE.ClampToEdgeWrapping;

    cleaningVolumeTexture.wrapR =
        THREE.ClampToEdgeWrapping;

    cleaningVolumeTexture.unpackAlignment =
        1;

    cleaningVolumeTexture.needsUpdate =
        true;

}


// RESET CLEANING VOLUME

function resetCleaningVolume() {

    if (

        !cleaningVolumeData ||
        !cleaningVolumeTexture

    ) {

        return;

    }


    cleaningVolumeData.fill(0);

    cleaningVolumeTexture.needsUpdate =
        true;


    resetCleaningInterpolation();

}


// BUILD CLEANING BOUNDS

function buildCleaningVolumeBounds() {

    if (!currentObject) {
        return;
    }


    currentObject.updateMatrixWorld(true);


    const worldBox =
        new THREE.Box3();

    worldBox.setFromObject(
        currentObject
    );


    const inverseRoot =
        new THREE.Matrix4();

    inverseRoot
        .copy(currentObject.matrixWorld)
        .invert();


    const corners = [

        new THREE.Vector3(
            worldBox.min.x,
            worldBox.min.y,
            worldBox.min.z
        ),

        new THREE.Vector3(
            worldBox.min.x,
            worldBox.min.y,
            worldBox.max.z
        ),

        new THREE.Vector3(
            worldBox.min.x,
            worldBox.max.y,
            worldBox.min.z
        ),

        new THREE.Vector3(
            worldBox.min.x,
            worldBox.max.y,
            worldBox.max.z
        ),

        new THREE.Vector3(
            worldBox.max.x,
            worldBox.min.y,
            worldBox.min.z
        ),

        new THREE.Vector3(
            worldBox.max.x,
            worldBox.min.y,
            worldBox.max.z
        ),

        new THREE.Vector3(
            worldBox.max.x,
            worldBox.max.y,
            worldBox.min.z
        ),

        new THREE.Vector3(
            worldBox.max.x,
            worldBox.max.y,
            worldBox.max.z
        )

    ];


    cleaningVolumeBounds.makeEmpty();


    for (
        const corner of corners
    ) {

        corner.applyMatrix4(
            inverseRoot
        );

        cleaningVolumeBounds
            .expandByPoint(corner);

    }


    const padding =
        CLEANING_RADIUS +
        GOO_BEVEL_WIDTH +
        2.0;


    cleaningVolumeBounds.min.x -= padding;
    cleaningVolumeBounds.min.y -= padding;
    cleaningVolumeBounds.min.z -= padding;

    cleaningVolumeBounds.max.x += padding;
    cleaningVolumeBounds.max.y += padding;
    cleaningVolumeBounds.max.z += padding;

}


// LOCAL -> CLEANING UVW

function localToCleaningUVW(
    localPoint
) {

    const size =
        new THREE.Vector3();

    cleaningVolumeBounds.getSize(size);


    return new THREE.Vector3(

        (
            localPoint.x -
            cleaningVolumeBounds.min.x
        ) / size.x,

        (
            localPoint.y -
            cleaningVolumeBounds.min.y
        ) / size.y,

        (
            localPoint.z -
            cleaningVolumeBounds.min.z
        ) / size.z

    );

}


// ADD CLEANING BRUSH

function addCleaningBrush(
    localPoint
) {

    if (

        !cleaningVolumeData ||
        !cleaningVolumeTexture

    ) {

        return;

    }


    const size =
        cleaningVolumeSize;


    const volumeSize =
        new THREE.Vector3();

    cleaningVolumeBounds.getSize(
        volumeSize
    );


    const uvw =
        localToCleaningUVW(
            localPoint
        );


    if (

        uvw.x < 0 ||
        uvw.x > 1 ||
        uvw.y < 0 ||
        uvw.y > 1 ||
        uvw.z < 0 ||
        uvw.z > 1

    ) {

        return;

    }


    const voxelSizeX =
        volumeSize.x /
        (size - 1);

    const voxelSizeY =
        volumeSize.y /
        (size - 1);

    const voxelSizeZ =
        volumeSize.z /
        (size - 1);


    const voxelSize =
        Math.min(
            voxelSizeX,
            voxelSizeY,
            voxelSizeZ
        );


    const radiusVoxels =
        Math.ceil(
            CLEANING_RADIUS /
            voxelSize
        );


    const centerX =
        Math.round(
            uvw.x *
            (size - 1)
        );

    const centerY =
        Math.round(
            uvw.y *
            (size - 1)
        );

    const centerZ =
        Math.round(
            uvw.z *
            (size - 1)
        );


    const minX =
        Math.max(
            0,
            centerX -
            radiusVoxels
        );

    const maxX =
        Math.min(
            size - 1,
            centerX +
            radiusVoxels
        );


    const minY =
        Math.max(
            0,
            centerY -
            radiusVoxels
        );

    const maxY =
        Math.min(
            size - 1,
            centerY +
            radiusVoxels
        );


    const minZ =
        Math.max(
            0,
            centerZ -
            radiusVoxels
        );

    const maxZ =
        Math.min(
            size - 1,
            centerZ +
            radiusVoxels
        );


    const radiusSquared =
        CLEANING_RADIUS *
        CLEANING_RADIUS;


    for (
        let z = minZ;
        z <= maxZ;
        z++
    ) {

        const localZ =
            cleaningVolumeBounds.min.z +
            (
                z /
                (size - 1)
            ) *
            volumeSize.z;


        const dz =
            localZ -
            localPoint.z;


        for (
            let y = minY;
            y <= maxY;
            y++
        ) {

            const localY =
                cleaningVolumeBounds.min.y +
                (
                    y /
                    (size - 1)
                ) *
                volumeSize.y;


            const dy =
                localY -
                localPoint.y;


            for (
                let x = minX;
                x <= maxX;
                x++
            ) {

                const localX =
                    cleaningVolumeBounds.min.x +
                    (
                        x /
                        (size - 1)
                    ) *
                    volumeSize.x;


                const dx =
                    localX -
                    localPoint.x;


                const distanceSquared =
                    dx * dx +
                    dy * dy +
                    dz * dz;


                if (
                    distanceSquared >
                    radiusSquared
                ) {

                    continue;

                }


                const distance =
                    Math.sqrt(
                        distanceSquared
                    );


                const falloff =
                    1.0 -
                    THREE.MathUtils.smoothstep(

                        distance,

                        CLEANING_RADIUS * 0.35,

                        CLEANING_RADIUS

                    );


                const value =
                    Math.round(
                        falloff * 255
                    );


                const index =
                    x +
                    y * size +
                    z * size * size;


                if (
                    value >
                    cleaningVolumeData[index]
                ) {

                    cleaningVolumeData[index] =
                        value;

                }

            }

        }

    }


    cleaningVolumeTexture.needsUpdate =
        true;

}


// INTERPOLATED CLEANING

function addInterpolatedCleaningBrush(
    localPoint
) {

    if (
        !lastCleaningLocalPoint
    ) {

        addCleaningBrush(localPoint);

        lastCleaningLocalPoint =
            localPoint.clone();

        return;

    }


    const distance =
        lastCleaningLocalPoint.distanceTo(
            localPoint
        );


    const spacing =
        CLEANING_RADIUS * 0.28;


    const steps =
        Math.max(
            1,
            Math.ceil(
                distance /
                spacing
            )
        );


    for (
        let i = 1;
        i <= steps;
        i++
    ) {

        const t =
            i / steps;


        const interpolated =
            lastCleaningLocalPoint
                .clone()
                .lerp(
                    localPoint,
                    t
                );


        addCleaningBrush(
            interpolated
        );

    }


    lastCleaningLocalPoint =
        localPoint.clone();

}



function resetCleaningInterpolation() {

    lastCleaningLocalPoint =
        null;

    lastBrushX =
        null;

    lastBrushY =
        null;

}


// GOO MATERIAL


function createDirtMaterial(

cleanTexture,
cleanFlipX,
cleanFlipY,
gooColor,
metalnessTexture


) {


const material =
    new THREE.MeshPhysicalMaterial({


        map:
            cleanTexture,

        color:
            new THREE.Color(
                0xffffff
            ),

        metalness:
           metalnessTexture
           ? 1.0
            : GOO_METALNESS,

            metalnessMap:
                metalnessTexture || null,

        roughness:
            GOO_ROUGHNESS,

        clearcoat:
            GOO_CLEARCOAT,

        clearcoatRoughness:
            GOO_CLEARCOAT_ROUGHNESS,

        specularIntensity:
            GOO_SPECULAR_INTENSITY,

        specularColor:
            new THREE.Color(
                0xffffff
            ),

        envMapIntensity:
            1.25,

        // ====================================================
        // IMPORTANT
        //
        // We deliberately keep the material opaque.
        //
        // The goo translucency is created by blending the
        // apple texture and goo colour inside the shader.
        //
        // This avoids the previous opacity/transmission
        // problems while still allowing the apple texture
        // to remain visible underneath the goo.
        // ====================================================

        transparent:
            false,

        opacity:
            1.0,

        transmission:
            0.0,

        thickness:
            0.0,

        ior:
            1.40

    });


material.onBeforeCompile =
    (shader) => {


        // ====================================================
        // UNIFORMS
        // ====================================================

        shader.uniforms.gooBaseColor = {

            value:
                new THREE.Color(
                    gooColor
                )

        };


        shader.uniforms.cleaningVolume = {

            value:
                cleaningVolumeTexture

        };


        shader.uniforms.cleaningBoundsMin = {

            value:
                cleaningVolumeBounds.min.clone()

        };


        shader.uniforms.cleaningBoundsMax = {

            value:
                cleaningVolumeBounds.max.clone()

        };


        shader.uniforms.gooEdgeSample = {

            value:
                GOO_EDGE_SAMPLE

        };


        shader.uniforms.gooBevelWidth = {

            value:
                GOO_BEVEL_WIDTH

        };


        shader.uniforms.gooBevelStrength = {

            value:
                GOO_BEVEL_STRENGTH

        };


        shader.uniforms.gooBevelCleanStart = {

            value:
                GOO_BEVEL_CLEAN_START

        };


        shader.uniforms.gooBevelCleanPeak = {

            value:
                GOO_BEVEL_CLEAN_PEAK

        };


        shader.uniforms.gooBevelCleanEnd = {

            value:
                GOO_BEVEL_CLEAN_END

        };


        shader.uniforms.gooDisplacement = {

            value:
                GOO_DISPLACEMENT

        };


        shader.uniforms.gooEdgeDarkness = {

            value:
                GOO_EDGE_DARKNESS

        };


        shader.uniforms.gooEdgeHighlight = {

            value:
                GOO_EDGE_HIGHLIGHT

        };


        shader.uniforms.rootInverseMatrix = {

            value:
                new THREE.Matrix4()

        };


        shader.uniforms.rootToViewMatrix = {

            value:
                new THREE.Matrix4()

        };


        material.userData.shader =
            shader;


        // ====================================================
        // VERTEX HEADER
        // ====================================================

        shader.vertexShader = `

            uniform sampler3D cleaningVolume;

            uniform vec3 cleaningBoundsMin;

            uniform vec3 cleaningBoundsMax;

            uniform float gooEdgeSample;

            uniform float gooDisplacement;

            uniform mat4 rootInverseMatrix;

            uniform mat4 rootToViewMatrix;


            varying vec3 vGooRootLocalPosition;

            varying vec3 vGooGradientView;


            vec3 gooRootLocalToUVW(
                vec3 p
            ) {

                return (

                    p -
                    cleaningBoundsMin

                ) /

                (

                    cleaningBoundsMax -
                    cleaningBoundsMin

                );

            }


            float gooSampleCleaning(
                vec3 rootLocal
            ) {

                vec3 uvw =
                    gooRootLocalToUVW(
                        rootLocal
                    );


                if (

                    uvw.x < 0.0 ||
                    uvw.x > 1.0 ||
                    uvw.y < 0.0 ||
                    uvw.y > 1.0 ||
                    uvw.z < 0.0 ||
                    uvw.z > 1.0

                ) {

                    return 0.0;

                }


                return texture(
                    cleaningVolume,
                    uvw
                ).r;

            }


            vec3 gooCleaningGradient(
                vec3 p
            ) {

                float d =
                    gooEdgeSample;


                float xp =
                    gooSampleCleaning(
                        p +
                        vec3(d, 0.0, 0.0)
                    );


                float xm =
                    gooSampleCleaning(
                        p -
                        vec3(d, 0.0, 0.0)
                    );


                float yp =
                    gooSampleCleaning(
                        p +
                        vec3(0.0, d, 0.0)
                    );


                float ym =
                    gooSampleCleaning(
                        p -
                        vec3(0.0, d, 0.0)
                    );


                float zp =
                    gooSampleCleaning(
                        p +
                        vec3(0.0, 0.0, d)
                    );


                float zm =
                    gooSampleCleaning(
                        p -
                        vec3(0.0, 0.0, d)
                    );


                return vec3(

                    xp - xm,

                    yp - ym,

                    zp - zm

                );

            }

        ` + shader.vertexShader;


        // ====================================================
        // BEGIN VERTEX
        // ====================================================

        shader.vertexShader =
            shader.vertexShader.replace(

                "#include <begin_vertex>",

                `

                #include <begin_vertex>


                vec3 gooWorldPosition =
                    (
                        modelMatrix *
                        vec4(
                            transformed,
                            1.0
                        )
                    ).xyz;


                vec3 gooRootPosition =
                    (
                        rootInverseMatrix *
                        vec4(
                            gooWorldPosition,
                            1.0
                        )
                    ).xyz;


                vGooRootLocalPosition =
                    gooRootPosition;


                vec3 gooVertexGradient =
                    gooCleaningGradient(
                        gooRootPosition
                    );


                float gooVertexGradientLength =
                    length(
                        gooVertexGradient
                    );


                if (
                    gooVertexGradientLength >
                    0.0001
                ) {

                    vGooGradientView =
                        normalize(

                            mat3(
                                rootToViewMatrix
                            ) *
                            gooVertexGradient

                        );

                }

                else {

                    vGooGradientView =
                        vec3(0.0);

                }


                float gooAmount =
                    gooSampleCleaning(
                        gooRootPosition
                    );


                float gooLip =
                    smoothstep(
                        0.01,
                        0.10,
                        gooVertexGradientLength
                    );


                gooLip *=
                    1.0 -
                    smoothstep(
                        0.25,
                        0.82,
                        gooAmount
                    );


                transformed +=
                    normal *
                    gooLip *
                    gooDisplacement;

                `

            );


        // ====================================================
        // FRAGMENT HEADER
        //
        // IMPORTANT:
        //
        // gooBaseColor is declared explicitly as GLSL.
        //
        // shader.uniforms alone does NOT declare the GLSL
        // variable and was the cause of the previous error.
        // ====================================================

        shader.fragmentShader = `

            uniform vec3 gooBaseColor;

            uniform sampler3D cleaningVolume;

            uniform vec3 cleaningBoundsMin;

            uniform vec3 cleaningBoundsMax;

            uniform float gooEdgeSample;

            uniform float gooBevelWidth;

            uniform float gooBevelStrength;

            uniform float gooBevelCleanStart;

            uniform float gooBevelCleanPeak;

            uniform float gooBevelCleanEnd;

            uniform float gooEdgeDarkness;

            uniform float gooEdgeHighlight;


            varying vec3 vGooRootLocalPosition;

            varying vec3 vGooGradientView;


            vec3 gooRootLocalToUVW(
                vec3 p
            ) {

                return (

                    p -
                    cleaningBoundsMin

                ) /

                (

                    cleaningBoundsMax -
                    cleaningBoundsMin

                );

            }


            float gooSampleCleaning(
                vec3 rootLocal
            ) {

                vec3 uvw =
                    gooRootLocalToUVW(
                        rootLocal
                    );


                if (

                    uvw.x < 0.0 ||
                    uvw.x > 1.0 ||
                    uvw.y < 0.0 ||
                    uvw.y > 1.0 ||
                    uvw.z < 0.0 ||
                    uvw.z > 1.0

                ) {

                    return 0.0;

                }


                return texture(
                    cleaningVolume,
                    uvw
                ).r;

            }


            vec3 gooCleaningGradient(
                vec3 p
            ) {

                float d =
                    gooEdgeSample;


                float xp =
                    gooSampleCleaning(
                        p +
                        vec3(d, 0.0, 0.0)
                    );


                float xm =
                    gooSampleCleaning(
                        p -
                        vec3(d, 0.0, 0.0)
                    );


                float yp =
                    gooSampleCleaning(
                        p +
                        vec3(0.0, d, 0.0)
                    );


                float ym =
                    gooSampleCleaning(
                        p -
                        vec3(0.0, d, 0.0)
                    );


                float zp =
                    gooSampleCleaning(
                        p +
                        vec3(0.0, 0.0, d)
                    );


                float zm =
                    gooSampleCleaning(
                        p -
                        vec3(0.0, 0.0, d)
                    );


                return vec3(

                    xp - xm,

                    yp - ym,

                    zp - zm

                );

            }

        ` + shader.fragmentShader;


        // ====================================================
        // BASE COLOUR
        //
        // THIS IS THE IMPORTANT PART.
        //
        // Three.js first performs its normal map sampling:
        //
        //     #include <map_fragment>
        //
        // Therefore diffuseColor.rgb is the correctly sampled
        // apple.png using the GLTF UV coordinates.
        //
        // We then blend the GREEN GOO OVER THAT TEXTURE.
        //
        // We do NOT replace the texture with a solid colour.
        // ====================================================

        shader.fragmentShader =
            shader.fragmentShader.replace(

                "#include <map_fragment>",

                `

                #include <map_fragment>


                // =================================================
                // ORIGINAL APPLE TEXTURE
                // =================================================

                vec3 gooCleanTextureColour =
                    diffuseColor.rgb;


                // =================================================
                // CLEANING VALUE
                //
                // 0.0 = untouched
                // 1.0 = heavily cleaned
                // =================================================

                float gooMapCleanAmount =
                    gooSampleCleaning(
                        vGooRootLocalPosition
                    );


                vec3 gooMapGradient =
                    gooCleaningGradient(
                        vGooRootLocalPosition
                    );


                float gooMapGradientLength =
                    length(
                        gooMapGradient
                    );


                // =================================================
                // GOO EDGE
                // =================================================

                float gooBoundary =
                    smoothstep(
                        0.015,
                        0.20,
                        gooMapCleanAmount
                    );


                float gooBoundaryFade =
                    1.0 -
                    smoothstep(
                        0.38,
                        0.72,
                        gooMapCleanAmount
                    );


                float gooEdgeMask =
                    gooBoundary *
                    gooBoundaryFade;


                gooEdgeMask *=
                    smoothstep(
                        0.002,
                        0.055,
                        gooMapGradientLength
                    );


                // =================================================
                // GOO COLOUR
                // =================================================

                vec3 gooBaseColour =
                    gooBaseColor;


                // Slightly deepen the green so the goo remains
                // visible over bright parts of the apple.
                gooBaseColour *=
                    0.97;


                // Darker edge colour.
                vec3 gooEdgeColour =
                    gooBaseColour *
                    (
                        1.0 -
                        gooEdgeDarkness
                    );


                float edgeDark =
                    gooEdgeMask *
                    0.22;


                vec3 finalGooColour =
                    mix(

                        gooBaseColour,

                        gooEdgeColour,

                        edgeDark

                    );


                // Small green highlight around the cleaned edge.
                finalGooColour +=

                    vec3(
                        0.08,
                        0.14,
                        0.025
                    ) *

                    gooEdgeMask *

                    gooEdgeHighlight;


                // =================================================
                // THICK GOO OVERLAY
                //
                // This is intentionally NOT ordinary opacity.
                //
                // Instead, the apple texture contributes a
                // significant amount of the final colour even
                // underneath dirty goo.
                //
                // This gives the impression of seeing the apple
                // through a translucent coloured substance.
                // =================================================

                const float GOO_TRANSPARENCY =
                    0.65;


                float gooVisibility =
                    1.0 -
                    smoothstep(
                        0.02,
                        0.82,
                        gooMapCleanAmount
                    );


                // Make the goo slightly stronger in the middle
                // of dirty regions.
                float gooThickness =
                    mix(
                        0.72,
                        1.0,
                        gooVisibility
                    );


                float gooLayerStrength =
                    GOO_TRANSPARENCY *
                    gooThickness;


                // =================================================
                // COLOUR MIX
                //
                // Dirty:
                //     apple texture + green goo
                //
                // Clean:
                //     almost entirely apple texture
                // =================================================

                vec3 gooThroughTexture =
                    mix(

                        gooCleanTextureColour,

                        finalGooColour,

                        gooLayerStrength

                    );


                // =================================================
                // CLEAN TRANSITION
                //
                // This smoothly removes the goo as the user
                // cleans the apple.
                // =================================================

                float cleanBlend =
                    smoothstep(
                        0.10,
                        0.78,
                        gooMapCleanAmount
                    );


                diffuseColor.rgb =
                    mix(

                        gooThroughTexture,

                        gooCleanTextureColour,

                        cleanBlend

                    );


                // =================================================
                // KEEP SURFACE OPAQUE
                //
                // The visual translucency is produced by the
                // colour blend above, not by material alpha.
                // =================================================

                diffuseColor.a =
                    1.0;

                `

            );


        // ====================================================
        // CLEAN-SIDE NORMAL BEVEL
        // ====================================================

        shader.fragmentShader =
            shader.fragmentShader.replace(

                "#include <normal_fragment_maps>",

                `

                #include <normal_fragment_maps>


                float gooNormalCleanAmount =
                    gooSampleCleaning(
                        vGooRootLocalPosition
                    );


                vec3 gooNormalGradient =
                    gooCleaningGradient(
                        vGooRootLocalPosition
                    );


                float gooNormalGradientLength =
                    length(
                        gooNormalGradient
                    );


                if (
                    gooNormalGradientLength >
                    0.0001
                ) {

                    vec3 cleanDirectionForBevel =
                        normalize(
                            vGooGradientView
                        );


                    vec3 surfaceNormalForBevel =
                        normalize(
                            normal
                        );


                    vec3 cleanTangentDirection =
                        cleanDirectionForBevel -
                        surfaceNormalForBevel *
                        dot(
                            cleanDirectionForBevel,
                            surfaceNormalForBevel
                        );


                    float cleanTangentLength =
                        length(
                            cleanTangentDirection
                        );


                    if (
                        cleanTangentLength >
                        0.0001
                    ) {

                        cleanTangentDirection =
                            normalize(
                                cleanTangentDirection
                            );


                        vec3 towardGooAlongSurface =
                            -cleanTangentDirection;


                        float bevelRise =
                            smoothstep(
                                gooBevelCleanStart,
                                gooBevelCleanPeak,
                                gooNormalCleanAmount
                            );


                        float bevelFall =
                            1.0 -
                            smoothstep(
                                gooBevelCleanPeak,
                                gooBevelCleanEnd,
                                gooNormalCleanAmount
                            );


                        float cleanSideBevelMask =
                            bevelRise *
                            bevelFall;


                        float boundaryGradientMask =
                            smoothstep(
                                0.004,
                                0.060,
                                gooNormalGradientLength
                            );


                        cleanSideBevelMask *=
                            boundaryGradientMask;


                        float shoulderProfile =
                            cleanSideBevelMask;


                        shoulderProfile =
                            shoulderProfile *
                            shoulderProfile *
                            (
                                3.0 -
                                2.0 *
                                shoulderProfile
                            );


                        vec3 cleanSideBevelNormal =
                            normalize(

                                surfaceNormalForBevel +

                                towardGooAlongSurface *

                                gooBevelStrength *

                                shoulderProfile

                            );


                        normal =
                            normalize(

                                mix(

                                    surfaceNormalForBevel,

                                    cleanSideBevelNormal,

                                    shoulderProfile

                                )

                            );

                    }

                }

                `

            );

    };


return material;

}



// UPDATE MATERIAL ROOT TRANSFORMS

function updateMaterialRootTransforms() {

    if (!currentObject) {
        return;
    }


    currentObject.updateMatrixWorld(true);


    const inverseRoot =
        new THREE.Matrix4();

    inverseRoot
        .copy(currentObject.matrixWorld)
        .invert();


    const rootToView =
        new THREE.Matrix4();

    rootToView
        .multiplyMatrices(
            camera.matrixWorldInverse,
            currentObject.matrixWorld
        );


    currentObject.traverse(

        (child) => {

            if (
                !child.isMesh ||
                !child.material
            ) {

                return;

            }


            const shader =
                child.material.userData.shader;


            if (!shader) {
                return;
            }


            if (
                shader.uniforms.rootInverseMatrix
            ) {

                shader.uniforms
                    .rootInverseMatrix
                    .value
                    .copy(inverseRoot);

            }


            if (
                shader.uniforms.rootToViewMatrix
            ) {

                shader.uniforms
                    .rootToViewMatrix
                    .value
                    .copy(rootToView);

            }


            if (
                shader.uniforms.cleaningVolume
            ) {

                shader.uniforms
                    .cleaningVolume
                    .value =
                    cleaningVolumeTexture;

            }


            if (
                shader.uniforms.cleaningBoundsMin
            ) {

                shader.uniforms
                    .cleaningBoundsMin
                    .value
                    .copy(
                        cleaningVolumeBounds.min
                    );

            }


            if (
                shader.uniforms.cleaningBoundsMax
            ) {

                shader.uniforms
                    .cleaningBoundsMax
                    .value
                    .copy(
                        cleaningVolumeBounds.max
                    );

            }

        }

    );

}


// LOAD NEXT OBJECT

function loadNextObject() {

    if (currentObject) {

        scene.remove(
            currentObject
        );


        currentObject.traverse(

            (child) => {

                if (
                    child.isMesh
                ) {

                    if (
                        child.geometry
                    ) {

                        child.geometry.dispose();

                    }


                    if (
                        child.material
                    ) {

                        child.material.dispose();

                    }

                }

            }

        );


        currentObject =
            null;

    }


    const objectData =
        objects[currentObjectIndex];


    const cleanTexture =
        textureLoader.load(
            objectData.cleanTexture
        );

    //METAL

    let metalnessTexture = null;

if (objectData.metalnessTexture) {

    metalnessTexture =
        textureLoader.load(
            objectData.metalnessTexture
        );

    metalnessTexture.flipY = false;

    metalnessTexture.colorSpace =
        THREE.NoColorSpace;

    metalnessTexture.minFilter =
        THREE.LinearMipmapLinearFilter;

    metalnessTexture.magFilter =
        THREE.LinearFilter;

    metalnessTexture.wrapS =
        THREE.ClampToEdgeWrapping;

    metalnessTexture.wrapT =
        THREE.ClampToEdgeWrapping;

    metalnessTexture.needsUpdate =
        true;

}


    // TEXTURE SETTINGS

    cleanTexture.flipY =
        false;

    cleanTexture.colorSpace =
        THREE.SRGBColorSpace;

    cleanTexture.minFilter =
        THREE.LinearMipmapLinearFilter;

    cleanTexture.magFilter =
        THREE.LinearFilter;

    cleanTexture.wrapS =
        THREE.ClampToEdgeWrapping;

    cleanTexture.wrapT =
        THREE.ClampToEdgeWrapping;

    cleanTexture.needsUpdate =
        true;


    console.log(
        "Loading object:",
        objectData.name
    );


    resetCleaningVolume();



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


        currentObject.rotation.set(
            0,
            0,
            0
        );


        currentObject.updateMatrixWorld(
            true
        );


        // ------------------------------------------------
        // Build root-space cleaning volume.
        // ------------------------------------------------

        buildCleaningVolumeBounds();

        createCleaningVolume();


        // ------------------------------------------------
        // Apply material.
        // ------------------------------------------------

        currentObject.traverse(

            (child) => {

                if (
                    !child.isMesh
                ) {

                    return;

                }


                child.material =
                    createDirtMaterial(

                        cleanTexture,
                        objectData.cleanFlipX,
                        objectData.cleanFlipY,
                        objectData.gooColor,
                        metalnessTexture

                    );

            }

        );


        scene.add(
            currentObject
        );


        updateMaterialRootTransforms();


        objectChanging =
            false;


        // ------------------------------------------------
        // PLAY DING WHEN NEW MODEL LOADS
        // ------------------------------------------------

        dingSound.currentTime = 0;

        dingSound.play().catch(
            () => {}
        );


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


        objectChanging =
            false;

    }

);



}


// START

loadNextObject();


// ANIMATION

function animate() {

    requestAnimationFrame(
        animate
    );


    if (currentObject) {

        currentObject.rotation.y +=
            0.001;

        currentObject.rotation.x +=
            0.001;

        currentObject.rotation.z +=
            0.001;


        updateMaterialRootTransforms();

    }


    renderer.render(
        scene,
        camera
    );

}


animate();


// RESIZE

window.addEventListener(

    "resize",

    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(

            window.innerWidth,
            window.innerHeight

        );

    }

);


// MOUSE POSITION

window.addEventListener(

    "pointermove",

    (event) => {

        mouse.x =
            (
                event.clientX /
                window.innerWidth
            ) *
            2 -
            1;


        mouse.y =
            -(
                event.clientY /
                window.innerHeight
            ) *
            2 +
            1;

    }

);


// ============================================================
// POINTER DOWN
// ============================================================

window.addEventListener(

    "pointerdown",

    () => {

        isScratching =
            true;

        strokeProgress =
            0;

    }

);


// ============================================================
// POINTER UP
// ============================================================

window.addEventListener(

    "pointerup",

    () => {

        isScratching =
            false;

        resetCleaningInterpolation();

        strokeProgress =
            0;

    }

);


// ============================================================
// MOUSE CLEANING
// ============================================================

window.addEventListener(

    "pointermove",

    () => {

        if (

            !isScratching ||
            !currentObject

        ) {

            return;

        }


        raycaster.setFromCamera(
            mouse,
            camera
        );


        const hits =
            raycaster.intersectObject(
                currentObject,
                true
            );


        if (
            hits.length === 0
        ) {

            return;

        }


        const hit =
            hits[0];


        if (
            !hit.point
        ) {

            return;

        }


        strokeProgress +=
            0.05;


        addHitForCleaning(
            hit
        );


        checkCleanPercentage();

    }

);


// ============================================================
// PROCESS RAYCAST HIT
// ============================================================

function addHitForCleaning(
    hit
) {

    if (

        !currentObject ||
        !hit ||
        !hit.point

    ) {

        return;

    }


    currentObject.updateMatrixWorld(
        true
    );


    const rootLocalPoint =
        currentObject.worldToLocal(
            hit.point.clone()
        );


    addInterpolatedCleaningBrush(
        rootLocalPoint
    );

}


// ============================================================
// WEBCAM + HANDPOSE
// ============================================================

async function setupHandTracking() {

    console.log(
        "1. Requesting camera..."
    );


    try {

        const stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        width: 640,

                        height: 480,

                        facingMode: "user"

                    },

                    audio: false

                });


        console.log(
            "2. Camera stream received"
        );


        video =
            document.createElement(
                "video"
            );


        video.autoplay =
            true;

        video.playsInline =
            true;

        video.muted =
            true;

        video.width =
            640;

        video.height =
            480;


        video.style.display =
            "none";


        document.body.appendChild(
            video
        );


        video.srcObject =
            stream;


        await new Promise(

            resolve => {

                video.onloadedmetadata =
                    resolve;

            }

        );


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


        await new Promise(

            resolve =>

                setTimeout(

                    resolve,
                    1000

                )

        );


        console.log(

            "4. VIDEO CURRENT TIME:",
            video.currentTime

        );


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

                gotHands(
                    results
                );

            }

        );

    }

    catch (error) {

        console.error(
            "Hand tracking setup failed:",
            error
        );

    }

}


// ============================================================
// START HAND TRACKING
// ============================================================

setupHandTracking();


// ============================================================
// HAND RESULTS
// ============================================================

function gotHands(
    results
) {

    hands =
        results;


    if (
        hands.length === 0
    ) {

        wristCursor.style.display =
            "none";


        scrubSound.pause();


        resetCleaningInterpolation();


        return;

    }


    const hand =
        hands[0];


    const wrist =
        hand.keypoints[0];


    const screen =
        wristToScreen(
            wrist
        );


    wristCursor.style.display =
        "block";


    wristCursor.style.left =
        (
            screen.x -
            15
        ) +
        "px";


    wristCursor.style.top =
        (
            screen.y -
            15
        ) +
        "px";


    if (
        !currentObject
    ) {

        return;

    }


    const hits =
        raycastFromWrist(
            wrist
        );


    if (
        hits.length > 0
    ) {

        


        scrubSound
            .play()
            .catch(
                () => {}
            );


        const hit =
            hits[0];


        addHitForCleaning(
            hit
        );


        checkCleanPercentage();

    }

    else {


        scrubSound.pause();

        scrubSound.currentTime =
            0;


        resetCleaningInterpolation();

    }

}


// ============================================================
// WRIST -> SCREEN
// ============================================================

function wristToScreen(
    wrist
) {

    if (!video) {

        return {
            x: 0,
            y: 0
        };

    }


    const screenX =
        (
            1 -
            wrist.x /
            video.videoWidth
        ) *
        window.innerWidth;


    const screenY =
        (
            wrist.y /
            video.videoHeight
        ) *
        window.innerHeight;


    return {

        x: screenX,

        y: screenY

    };

}


// ============================================================
// RAYCAST FROM WRIST
// ============================================================

function raycastFromWrist(
    wrist
) {

    const screen =
        wristToScreen(
            wrist
        );


    mouse.x =
        (
            screen.x /
            window.innerWidth
        ) *
        2 -
        1;


    mouse.y =
        -(
            screen.y /
            window.innerHeight
        ) *
        2 +
        1;


    raycaster.setFromCamera(
        mouse,
        camera
    );


    return raycaster.intersectObject(
        currentObject,
        true
    );

}


// ============================================================
// CLEAN PERCENTAGE
// ============================================================

function getCleanPercentage() {

    if (
        !cleaningVolumeData
    ) {

        return 0;

    }


    let cleaned = 0;


    const total =
        cleaningVolumeData.length;


    for (
        let i = 0;
        i < total;
        i++
    ) {

        if (
            cleaningVolumeData[i] > 200
        ) {

            cleaned++;

        }

    }


    return (
        cleaned /
        total
    ) * 100;

}
