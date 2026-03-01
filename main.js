import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ------------------------

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0xaaaaaa );

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set( 2, 3, 7 );

const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( container.clientWidth, container.clientHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
container.appendChild( renderer.domElement );

// Add light
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
directionalLight.position.set( 5, 10, 7.5 );
scene.add( directionalLight );

// HDRI environment map
const hdrLoader = new RGBELoader();
// const rgbeLoader = new RGBELoader();
hdrLoader.load('./assets/hdri/studio_env.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;

    scene.environment = texture;
    scene.background = texture; // Optional: Use HDRI as background

    // If you want a solid color background but HDRI reflections:
    scene.background = new THREE.Color(0xaaaaaa);
});

// Controls how much the environment affects the materials
// scene.environmentIntensity = 0.5;
scene.environmentIntensity = 1; // Brighter reflections
renderer.toneMappingExposure = 0.8; // Standard exposure

// Modern Three.js also uses tone mapping to handle "bright" HDR data
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1; // Increase for a brighter look

// The loader
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader(); // Optional: Provide a DRACOLoader instance to decode compressed mesh data
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/' );
loader.setDRACOLoader( dracoLoader );

function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize( width, height );
}

window.addEventListener('resize', resize);
resize();

// Load the model
loader.load( 
    './assets/models/chair_2.glb', ( gltf ) => {
        const model = gltf.scene;

        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const targetSize = 5;
        const scale = targetSize / Math.max(size.x, size.y, size.z);
        model.scale.set(scale, scale, scale);

        const scaledBox = new THREE.Box3().setFromObject(model);

        const center = new THREE.Vector3();
        scaledBox.getCenter(center);

        model.position.x = -center.x;
        model.position.z = -center.z;
        model.position.y = (-scaledBox.min.y) - 1.5;

        scene.add( model );
        console.log("Model loaded!", model);

        updateMaterial('legs', 'wood');
        updateColors('fabric', '#666666');
        updateMaterial('fabric', 'fabric');

        const defaultWoodBtn = document.querySelector('.mat-btn[data-tex="wood"]');
        if (defaultWoodBtn) defaultWoodBtn.classList.add('active');

        const defaultColorBtn = document.querySelector('.color-btn[data-color="#666666"]');
        if (defaultColorBtn) defaultColorBtn.classList.add('active');

        const defaultFabricBtn = document.querySelector('.mat-btn[data-tex="fabric"]');
        if (defaultFabricBtn) defaultFabricBtn.classList.add('active');

        const shadowPlaneGeom = new THREE.PlaneGeometry( 20, 20 );
        const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.2 });
        const shadowPlane = new THREE.Mesh( shadowPlaneGeom, shadowPlaneMat );

        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.01; // Slightly above the ground to prevent z-fighting
        shadowPlane.receiveShadow = true;
        
        const finalBox = new THREE.Box3().setFromObject(model);
        shadowPlane.position.y = finalBox.min.y + 0.01;
        scene.add( shadowPlane );

        // Enable shadows for the model and light
        directionalLight.castShadow = true;
        model.traverse(n => { if (n.isMesh) n.castShadow = true; });
    },
    ( xhr ) => { console.log((xhr.loaded / xhr.total * 100) + '% loaded'); },
    ( error ) => { console.error('An error happened', error); }
);

// Animation loop
function animate() {
    requestAnimationFrame( animate );
    renderer.render( scene, camera );
}
animate();

// Handle window resize
window.addEventListener( 'resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}, false );

// Add orbit controls
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true; // For smoother controls
controls.dampingFactor = 0.05;

controls.minDistance = 4; // How close can they get?
controls.maxDistance = 10; // How far can they go?

controls.maxPolarAngle = Math.PI / 2; // Locks the camera from going below the floor plane

controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enablePan = false;

const textureLoader = new THREE.TextureLoader();

function loadTexture(path, isColor = true) {
    const tex = textureLoader.load(path);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    // This is the most common reason colors look "wrong"
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace; 
    return tex;
}

const textures = {
    fabric: loadTexture('./assets/textures/Fabric/Fabric_001_basecolor_2.jpg'),
    fabricNormal: loadTexture('./assets/textures/Fabric/Fabric_001_normal.jpg', false),
    fabricRoughness: loadTexture('./assets/textures/Fabric/Fabric_001_roughness_2.jpg', false),

    fabric2: loadTexture('./assets/textures/Fabric/Fabric_002_basecolor_2.jpg'),
    fabric2Normal: loadTexture('./assets/textures/Fabric/Fabric_002_normal.jpg', false),
    fabric2Roughness: loadTexture('./assets/textures/Fabric/Fabric_002_roughness.jpg', false),
    fabric2Displacement: loadTexture('./assets/textures/Fabric/Fabric_002_displacement.jpg', false),

    metal: loadTexture('./assets/textures/Metal/Metal_001_basecolor_2.jpg'),
    metalNormal: loadTexture('./assets/textures/Metal/Metal_001_normal.jpg', false),
    metalRoughness: loadTexture('./assets/textures/Metal/Metal_001_roughness_2.jpg', false),

    wood: loadTexture('./assets/textures/Wood/Wood_001_basecolor.jpg'),
    woodNormal: loadTexture('./assets/textures/Wood/Wood_001_normal.jpg', false),
    woodRoughness: loadTexture('./assets/textures/Wood/Wood_001_roughness_2.jpg', false),

    
};

Object.values(textures).forEach(tex => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
});

const partGroups = {
    'legs': ['Nojka', 'Plastik'],
    'plastic': ['Metal'],
    'fabric': ['Spinka', 'Sideniya'],
};

function updateMaterial(groupName, textureKey) {
    const newTexture = textures[textureKey];
    newTexture.repeat.set(4, 4);
    
    scene.traverse((child) => {
        if (child.isMesh && partGroups[groupName].includes(child.name)) {
            child.material.map = newTexture;

            child.material.normalMap = textures[textureKey + 'Normal'] || null;
            child.material.normalScale.set(1, 1); // Reset normal scale to default

            child.material.roughnessMap = textures[textureKey + 'Roughness'] || null;

            child.material.displacementMap = textures[textureKey + 'Displacement'] || null;

            child.material.roughness = 1.0; 
            child.material.metalness = 0.0;

            // child.material.color.set(0xffffff); // Reset color so texture shows clearly
            child.material.needsUpdate = true;
        }
    });
}

function updateColors(groupName, hexColor) {
    const color = new THREE.Color(hexColor);

    scene.traverse((child) => {
        if (child.isMesh && partGroups[groupName].includes(child.name)) {
            child.material.color.set(color);

            if (child.material.normalMap) {
                child.material.normalScale.set(1, 1); // Reset normal scale to default
            }
        }
    });
}

document.querySelectorAll('.color-btn').forEach(button => {
    const color = button.getAttribute('data-color');
    button.style.backgroundColor = color;
});

document.querySelectorAll('.mat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const group = e.currentTarget.getAttribute('data-group');
        const texKey = e.currentTarget.getAttribute('data-tex');
        updateMaterial(group, texKey);
        setActiveButton(e.currentTarget);
    });
});

// Handle color change from dropdown, needs to be at bottom
document.querySelectorAll('.color-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const group = e.currentTarget.getAttribute('data-group');
        const color = e.currentTarget.getAttribute('data-color');
        updateColors(group, color);
        setActiveButton(e.currentTarget);
    });
});


function setActiveButton(clickedElement) {
    // 1. Get the group name (fabric or legs) to ensure we only deselect within that category
    const group = clickedElement.getAttribute('data-group');
    
    // 2. Find all buttons in the same control group
    const parent = clickedElement.closest('.control-group');
    const buttons = parent.querySelectorAll('button');
    
    // 3. Remove 'active' class from all buttons in this group
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 4. Add 'active' class to the clicked one
    clickedElement.classList.add('active');
}