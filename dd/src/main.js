import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'


gsap.registerPlugin(ScrollTrigger)
function fun(){
    
// Initialize scene
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
camera.position.z = 5

// Create a loading manager to track progress
const loadingManager = new THREE.LoadingManager()
let sceneReady = false

// Loading animation
const loadingElement = document.createElement('div')
loadingElement.id = 'loading'
loadingElement.innerHTML = '<div class="loader"></div><p>Loading 3D Environment...</p>'
document.body.appendChild(loadingElement)

loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = itemsLoaded / itemsTotal
    gsap.to('.loader', {
        width: `${progress * 100}%`,
        duration: 0.5,
        ease: 'power1.out'
    })
}

loadingManager.onLoad = () => {
    sceneReady = true
    gsap.to('#loading', {
        opacity: 0,
        duration: 1,
        delay: 0.5,
        onComplete: () => {
            loadingElement.remove()
            // Start intro animation when everything is loaded
            startIntroAnimation()
        }
    })
}

// Load HDR environment map with RGBELoader
const rgbeLoader = new RGBELoader(loadingManager)
rgbeLoader.load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/golden_bay_2k.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.colorSpace = THREE.SRGBColorSpace
    
    // Animate environment intensity
    const envIntensity = { value: 0 }
    gsap.to(envIntensity, {
        value: 1,
        duration: 2,
        delay: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
            scene.environment = texture
            scene.environment.intensity = envIntensity.value
        }
    })
})
// Load 3D model
const loader = new GLTFLoader(loadingManager)
let mixer
let model

loader.load('./public/dd.glb', 
    // Success callback
    function(gltf) {
        model = gltf.scene
        
        // Initially hide the model
        model.scale.set(0, 0, 0)
        scene.add(model)

        // Setup animation mixer
        mixer = new THREE.AnimationMixer(model)
        
        // Play all animations
        if (gltf.animations.length > 0) {
            gltf.animations.forEach((clip) => {
                mixer.clipAction(clip).play()
            })
        }
    },
    // Progress callback
    function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded')
    },
    // Error callback
    function(error) {
        console.log('An error occurred loading the model:', error)
    }
)

// Setup renderer
const canvas = document.querySelector('#canvas')
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, alpha: true})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.5

// Setup controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.screenSpacePanning = false
controls.minPolarAngle = 0
controls.maxPolarAngle = Math.PI / 2
controls.minDistance = 580
controls.maxDistance = 700
controls.enabled = false // Initially disable controls

// Function to start intro animation
function startIntroAnimation() {
    // Enable controls after intro animation
    setTimeout(() => {
        controls.enabled = true
    }, 2000)
    
    // Animate model appearance
    if (model) {
        gsap.to(model.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 2,
            ease: 'elastic.out(1, 0.5)',
            delay: 0.5
        })
        
        // Add a subtle floating animation
        gsap.to(model.position, {
            y: '+=0.5',
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut'
        })
    }
    
    // Animate UI elements
    gsap.from('nav', {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        delay: 0.8
    })
    
    gsap.from('#blob', {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        delay: 1
    })
    
    // Animate each navigation item with stagger
    gsap.from('#right #ups', {
        opacity: 0,
        x: 20,
        duration: 0.8,
        stagger: 0.2,
        ease: 'back.out(1.7)',
        delay: 1.2
    })
    
    // Create a scroll-triggered animation for the model
    ScrollTrigger.create({
        trigger: '#page',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
            if (model) {
                // Rotate model based on scroll position
                gsap.to(model.rotation, {
                    y: self.progress * Math.PI * 2,
                    duration: 0.5,
                    ease: 'power1.out'
                })
                
                // Scale model slightly based on scroll
                const scale = 1 + self.progress * 0.1
                gsap.to(model.scale, {
                    x: scale,
                    y: scale,
                    z: scale,
                    duration: 0.5,
                    ease: 'power1.out'
                })
            }
        }
    })
}

// Animation loop
function animate() {
    requestAnimationFrame(animate)
    
    // Update animations
    if (mixer) {
        mixer.update(0.016)
    }
    
    controls.update()
    renderer.render(scene, camera)
}
animate()

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// Add mouse move effect for parallax
document.addEventListener('mousemove', (event) => {
    if (model && sceneReady) {
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1
        const mouseY = -(event.clientY / window.innerHeight) * 2 + 1
        
        gsap.to(model.rotation, {
            x: mouseY * 0.1,
            y: mouseX * 0.1,
            duration: 1,
            ease: 'power2.out'
        })
    }
})
let idx = document.querySelector(".idx");
let idx1 = document.querySelector(".idx1");
let idx2 = document.querySelector(".idx2");
idx.addEventListener("click", (e) => 
{

document.querySelector("#sev").style.opacity = "1";
document.querySelector("#sev").style.transition = "all 0.5s ease";
document.querySelector("#adv").style.opacity = "0";
document.querySelector("#adv").style.transition = "all 0.5s ease";
});
idx1.addEventListener("click", () => 
{

document.querySelector("#adv").style.opacity = "1";
document.querySelector("#adv").style.transition = "all 0.5s ease";
document.querySelector("#con").style.opacity = "0";
document.querySelector("#con").style.transition = "all 0.5s ease";

});
idx2.addEventListener("click", () => 
{
document.querySelector("#con").style.opacity = "1";
document.querySelector("#con").style.transition = "all 0.5s ease";

});

let left = document.querySelector("#left");
left.addEventListener("click", () =>{
    document.querySelector("#sev").style.opacity = "0";
    document.querySelector("#sev").style.transition = "all 0.5s ease";
    document.querySelector("#adv").style.opacity = "0";
    document.querySelector("#adv").style.transition = "all 0.5s ease";
    document.querySelector("#con").style.opacity = "0";
    document.querySelector("#con").style.transition = "all 0.5s ease";})

}
fun();
// let cursor = document.querySelector("#cursor");
// window.addEventListener("mousemove",(e)=>{
//     gsap.to(cursor,{
//         x : e.clientX,
//         y : e.clientY,
//         duration : 0.5,
//         ease : "power3.in"#cursor {
//           position: absolute;
//           top: 0;
//           left: 0;
//           width: 10px;
//           height: 10px;
//           border-radius: 50%;
//           background-color: #000;
//           pointer-events: none;
//         }
        
//         #cursor::after {
//           content: "";
//           position: absolute;
//           top: 50%;
//           left: 50%;
//           transform: translate(-50%, -50%);
//           width: 20px;
//           height: 20px;
//           border-radius: 50%;
//           background-color: #000;
//           opacity: 0.5;
//         }
//     })
// })

const cursor = document.getElementById('cursor');
        
        document.addEventListener('mousemove', (e) => {
          cursor.style.top = `${e.clientY}px`;
          cursor.style.left = `${e.clientX}px`;
        });
        
        document.addEventListener('mouseleave', () => {
          cursor.style.opacity = 0;
        });
        
        document.addEventListener('mouseenter', () => {
          cursor.style.opacity = 1;
        });