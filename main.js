import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enabled = true;
controls.minDistance = 10;
controls.maxDistance = 50;

function translationMatrix(tx, ty, tz) {
	return new THREE.Matrix4().set(
		1, 0, 0, tx,
		0, 1, 0, ty,
		0, 0, 1, tz,
		0, 0, 0, 1
	);
}

function rotationMatrixX(theta) {
    return new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, Math.cos(theta), -Math.sin(theta), 0,
        0, Math.sin(theta), Math.cos(theta), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixY(theta) {
    return new THREE.Matrix4().set(
        Math.cos(theta), 0, Math.sin(theta), 0,
        0, 1, 0, 0,
        -Math.sin(theta), 0, Math.cos(theta), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixZ(theta) {
	return new THREE.Matrix4().set(
		Math.cos(theta), -Math.sin(theta), 0, 0,
		Math.sin(theta),  Math.cos(theta), 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	);
}

// Gouraud Shader for Planet 2
function createGouraudMaterial(materialProperties) {    
    const numLights = 1;
    // Vertex Shader in GLSL
    let vertexShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;
        varying vec3 vertexColor;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace);
            vec3 result = vec3(0.0);
            for(int i = 0; i < N_LIGHTS; i++) {
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector);
                vec3 L = normalize(surface_to_light_vector);
                vec3 H = normalize(L + E);
                float diffuse = max(dot(N, L), 0.0);
                float specular = pow(max(dot(N, H), 0.0), smoothness);
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4(position, 1.0);
            N = normalize(mat3(model_transform) * normal / squared_scale);
            vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
            vertexColor = phong_model_lights(N, vertex_worldspace);
        }
    `;
   
    // Fragment Shader in GLSL
    let fragmentShader = `
        varying vec3 vertexColor;

        void main() {
            gl_FragColor = vec4(vertexColor, 1.0);
        }
    `;

    let shape_color = new THREE.Vector4(
        materialProperties.color.r, 
        materialProperties.color.g, 
        materialProperties.color.b,
        1.0
    );
    
    // Uniforms
    const uniforms = {
        ambient: { value: materialProperties.ambient },
        diffusivity: { value: materialProperties.diffusivity },
        specularity: { value: materialProperties.specularity },
        smoothness: { value: materialProperties.smoothness },
        shape_color: { value: shape_color },
        squared_scale: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        camera_center: { value: new THREE.Vector3() },
        model_transform: { value: new THREE.Matrix4() },
        projection_camera_model_transform: { value: new THREE.Matrix4() },
        light_positions_or_vectors: { value: [] },
        light_colors: { value: [] },
        light_attenuation_factors: { value: [] }
    };

    // ShaderMaterial using the custom vertex and fragment shaders
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
}

// Custom Phong Shader has already been implemented, no need to make change.
function createPhongMaterial(materialProperties) {
    const numLights = 1;
    // Vertex Shader
    let vertexShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace);
            vec3 result = vec3(0.0);
            for(int i = 0; i < N_LIGHTS; i++) {
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector);
                vec3 L = normalize(surface_to_light_vector);
                vec3 H = normalize(L + E);
                float diffuse = max(dot(N, L), 0.0);
                float specular = pow(max(dot(N, H), 0.0), smoothness);
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4(position, 1.0);
            N = normalize(mat3(model_transform) * normal / squared_scale);
            vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
        }
    `;
    // Fragment Shader
    let fragmentShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace);
            vec3 result = vec3(0.0);
            for(int i = 0; i < N_LIGHTS; i++) {
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector);
                vec3 L = normalize(surface_to_light_vector);
                vec3 H = normalize(L + E);
                float diffuse = max(dot(N, L), 0.0);
                float specular = pow(max(dot(N, H), 0.0), smoothness);
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        void main() {
            // Compute an initial (ambient) color:
            vec4 color = vec4(shape_color.xyz * ambient, shape_color.w);
            // Compute the final color with contributions from lights:
            color.xyz += phong_model_lights(normalize(N), vertex_worldspace);
            gl_FragColor = color;
        }
    `;

    let shape_color = new THREE.Vector4(
        materialProperties.color.r, 
        materialProperties.color.g, 
        materialProperties.color.b, 
        1.0
    );
    // Prepare uniforms
    const uniforms = {
        ambient: { value: materialProperties.ambient },
        diffusivity: { value: materialProperties.diffusivity },
        specularity: { value: materialProperties.specularity },
        smoothness: { value: materialProperties.smoothness },
        shape_color: { value: shape_color },
        squared_scale: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        camera_center: { value: new THREE.Vector3() },
        model_transform: { value: new THREE.Matrix4() },
        projection_camera_model_transform: { value: new THREE.Matrix4() },
        light_positions_or_vectors: { value: [] },
        light_colors: { value: [] },
        light_attenuation_factors: { value: [] }
    };

    // ShaderMaterial using the custom vertex and fragment shaders
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
}

// Custom shader for planet 3's ring with sinusoidal brightness variation
function createRingMaterial(materialProperties) {
    let vertexShader = `
        varying vec3 vPosition;
        void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `;

    // Fragment shader to create the brightness variation with sine finction
    let fragmentShader = `

        #define M_PI 3.1415926535897932384626433832795
        uniform vec3 color;
        varying vec3 vPosition;


        void main() {
            float distance = length(vPosition);
            float brightness = 0.5 + 0.5 * sin(distance * 10.0 * M_PI); // The brightness oscillates 5 times per unit distance
            gl_FragColor = vec4(color * brightness, 1.0);
        }
    `;

    return new THREE.ShaderMaterial({
        uniforms: {
            color: {value: materialProperties.color}
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide
    });
}

// This function is used to update the uniform of the planet's materials in the animation step. No need to make any change
function updatePlanetMaterialUniforms(planet) {
    const material = planet.material;
    if (!material.uniforms) return;

    const uniforms = material.uniforms;

    const numLights = 1;
    const lights = scene.children.filter(child => child.isLight).slice(0, numLights);
    // Ensure we have the correct number of lights
    if (lights.length < numLights) {
        console.warn(`Expected ${numLights} lights, but found ${lights.length}. Padding with default lights.`);
    }
    
    // Update model_transform and projection_camera_model_transform
    planet.updateMatrixWorld();
    camera.updateMatrixWorld();

    uniforms.model_transform.value.copy(planet.matrixWorld);
    uniforms.projection_camera_model_transform.value.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
    ).multiply(planet.matrixWorld);

    // Update camera_center
    uniforms.camera_center.value.setFromMatrixPosition(camera.matrixWorld);

    // Update squared_scale (in case the scale changes)
    const scale = planet.scale;
    uniforms.squared_scale.value.set(
        scale.x * scale.x,
        scale.y * scale.y,
        scale.z * scale.z
    );

    // Update light uniforms
    uniforms.light_positions_or_vectors.value = [];
    uniforms.light_colors.value = [];
    uniforms.light_attenuation_factors.value = [];

    for (let i = 0; i < numLights; i++) {
        const light = lights[i];
        if (light) {
            let position = new THREE.Vector4();
            if (light.isDirectionalLight) {
                // For directional lights
                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(light.quaternion);
                position.set(direction.x, direction.y, direction.z, 0.0);
            } else if (light.position) {
                // For point lights
                position.set(light.position.x, light.position.y, light.position.z, 1.0);
            } else {
                // Default position
                position.set(0.0, 0.0, 0.0, 1.0);
            }
            uniforms.light_positions_or_vectors.value.push(position);

            // Update light color
            const color = new THREE.Vector4(light.color.r, light.color.g, light.color.b, 1.0);
            uniforms.light_colors.value.push(color);

            // Update attenuation factor
            let attenuation = 0.0;
            if (light.isPointLight || light.isSpotLight) {
                const distance = light.distance || 1000.0; // Default large distance
                attenuation = 1.0 / (distance * distance);
            } else if (light.isDirectionalLight) {
                attenuation = 0.0; // No attenuation for directional lights
            }
            // Include light intensity
            const intensity = light.intensity !== undefined ? light.intensity : 1.0;
            attenuation *= intensity;

            uniforms.light_attenuation_factors.value.push(attenuation);
        } else {
            // Default light values
            uniforms.light_positions_or_vectors.value.push(new THREE.Vector4(0.0, 0.0, 0.0, 0.0));
            uniforms.light_colors.value.push(new THREE.Vector4(0.0, 0.0, 0.0, 1.0));
            uniforms.light_attenuation_factors.value.push(0.0);
        }
    }
}

let planets = [];
let clock = new THREE.Clock();
let attachedObject = null;
let blendingFactor = 0.025;

// Planet 2 Attributes js Object
let planet2attributes = {
    color: new THREE.Color(0x80FFFF),
    ambient: 0.0,
    diffusivity: 0.5,
    specularity: 1.0,
    smoothness: 40.0
}
// Create the sun
let sunGeometry = new THREE.SphereGeometry(1, 32, 32);
const sunMaterial = createPhongMaterial({
    color: new THREE.Color(0xffffff),
    ambient: 0.5,
    diffusivity: 1.0,
    specularity: 1.0,
    smoothness: 100.0
});
let sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunMesh)

let sunLight = new THREE.PointLight(0xffffff, 1, 0, 1);
scene.add(sunLight);

// Planet 1: Flat-shaded Gray Planet
let planet1 = new THREE.SphereGeometry(1, 8, 6);
const material1 = new THREE.MeshPhongMaterial({ 
    color: 0x808080,
    flatShading: true
});
let planetMesh1 = new THREE.Mesh(planet1, material1);

scene.add(planetMesh1)

// Planet 2: Swampy Green-Blue with Dynamic Shading
let planet2 = new THREE.SphereGeometry(1, 8, 8);

const material2 = createPhongMaterial(planet2attributes)

let planetMesh2 = new THREE.Mesh(planet2, material2)

scene.add(planetMesh2)

// Planet 3: Muddy Brown-Orange Planet with Ring
let planet3 = new THREE.SphereGeometry(1, 16, 16)

const material3 = createPhongMaterial({
    color: new THREE.Color(0xB08040),
    ambient: 0.0,
    diffusivity: 1.0,
    specularity: 1.0,
    smoothness: 100.0
})

let planetMesh3 = new THREE.Mesh(planet3, material3)

scene.add(planetMesh3)

// Planet 3 Ring
let ring = new THREE.RingGeometry(1.5, 2.5, 64)

const ringShader = createRingMaterial({color: new THREE.Color(0xB08040)})

let ringMesh = new THREE.Mesh(ring, ringShader)

planetMesh3.add(ringMesh)

// Planet 4: Soft Light Blue Planet
let planet4 = new THREE.SphereGeometry(1, 16, 16);

const material4 = new createPhongMaterial({
    color: new THREE.Color(0x0000D1),
    ambient: 0.0,
    diffusivity: 1.0,
    specularity: 1.0,
    smoothness: 100.0
})

let planetMesh4 = new THREE.Mesh(planet4, material4)
scene.add (planetMesh4)

// Planet 4's Moon
let moon = new THREE.SphereGeometry(1, 4, 2);
const moonMaterial = new THREE.MeshPhongMaterial({
    color: 0xFDFD96, // Pale yellow
    flatShading: true
}
)
let moonMesh = new THREE.Mesh(moon, moonMaterial)

scene.add(moonMesh)

planets = [
    // Planet's data here
    { mesh: planetMesh1, distance: 5, speed: 1 },
    { mesh: planetMesh2, distance: 8, speed: 5/8.0 },
    { mesh: planetMesh3, distance: 11, speed: 5/11.0},
    { mesh: planetMesh4, distance: 14, speed: 5/14.0},
    { mesh: moonMesh, distance: 14, speed: 5/14.0}
];

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

// Handle keyboard input
document.addEventListener('keydown', onKeyDown, false);

animate();

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


// Camera attachment given the key being pressed
// Hint: This step you only need to determine the object that are attached to and assign it to a variable you have to store the attached object.
function onKeyDown(event) {
    switch (event.keyCode) {
        case 48: // '0' key - Detach camera
            attachedObject = null
            break;
        case 49: // '1' - Attach to planet 1
            attachedObject = 0;
            break;
        case 50: // '2' - Attach to planet 2
            attachedObject = 1;
            break;
        case 51: // '3' - Attach to planet 3
            attachedObject = 2;
            break;
        case 52: // '4' - Attach to planet 4
            attachedObject = 3
            break;
        case 53: // '5' - Attach to planet 4's moon
            attachedObject = 4
    }
}

function animate() {
    requestAnimationFrame(animate);

    let time = clock.getElapsedTime();

    // Sun radius and color
    let period10 = time % 10.0;

    let osc = Math.sin(2 * Math.PI / 10 * time) // Sinosoidal 0 - 1
    let alpha = - 1 / 5 * Math.abs(period10 - 5) + 1 // Linear 0 - 1 for 5 seconds then 1 - 0 next 5 seconds

    let radius = 2 * alpha + 1 // Radius range is now 1 - 3
    let color = new THREE.Color(1, alpha, alpha)
    sunMesh.scale.set(radius, radius, radius) // Sun swells from radius 1 to 3 then back to 1 in 10 seconds
    
    // Update sun material color through uniforms
    if (sunMesh.material.uniforms && sunMesh.material.uniforms.shape_color) {
        sunMesh.material.uniforms.shape_color.value.set(color.r, color.g, color.b, 1.0);
    }

    // Update sun light
    sunLight.power = Math.pow(10, radius)
    sunLight.color.copy(color)

    // Loop through all the orbiting planets and apply transformation to create animation effect
    planets.forEach(function (obj, index) {
        let planet = obj.mesh
        let distance = obj.distance
        let speed = obj.speed
        let angle = speed * time

        // Model transformations for the planets
        // Hint: Some of the planets have the same set of transformation matrices, but for some you have to apply some additional transformation to make it work (e.g. planet4's moon, planet3's wobbling effect(optional)).
        
        const model_transform = new THREE.Matrix4()
        const translation = translationMatrix(distance, 0, 0)
        const rotation = rotationMatrixY(angle);

        // Ring Wobble
        if(planet == planetMesh3){
            let wobbleAngle = Math.PI * 0.5 * (Math.sin(time) + 1) // Oscillates between 0 and PI and varies over time
            const rotX = rotationMatrixX(wobbleAngle)
            const rotZ = rotationMatrixZ(wobbleAngle)

            model_transform.multiplyMatrices(rotX, model_transform)
            model_transform.multiplyMatrices(rotZ, model_transform)

        }
        else if (planet == moonMesh){ // Moon orbit
            const moonTranslate = translationMatrix(2.5, 0, 0)
            const moonRotation = rotationMatrixY(time) // Orbits 1 rad/sec
    
            model_transform.multiplyMatrices(moonTranslate, model_transform)
            model_transform.multiplyMatrices(moonRotation, model_transform)
        }

        model_transform.multiplyMatrices(translation, model_transform)
        model_transform.multiplyMatrices(rotation, model_transform)


        planet.matrix.copy(model_transform);
        planet.matrixAutoUpdate = false;
        
        // Camera attachment logic here, when certain planet is being attached, we want the camera to be following the planet by having the same transformation as the planet itself. No need to make changes.
        if (attachedObject === index){
            let cameraTransform = new THREE.Matrix4();

            // Copy the transformation of the planet (Hint: for the wobbling planet 3, you might have to rewrite to the model_tranform so that the camera won't wobble together)
            if(planet == planetMesh3){ // Non-wobbling camera
                cameraTransform.multiplyMatrices(translation, cameraTransform)
                cameraTransform.multiplyMatrices(rotation, cameraTransform)
            }
            else{
                cameraTransform.copy(model_transform);
            }
            
            
            // Add a translation offset of (0, 0, 10) in front of the planet
            let offset = translationMatrix(0, 0, 10);
            cameraTransform.multiply(offset);

            // Apply the new transformation to the camera position
            let cameraPosition = new THREE.Vector3();
            cameraPosition.setFromMatrixPosition(cameraTransform);
            camera.position.lerp(cameraPosition, blendingFactor);

            // Make the camera look at the planet
            let planetPosition = new THREE.Vector3();
            planetPosition.setFromMatrixPosition(planet.matrix);
            camera.lookAt(planetPosition);

            // Disable controls
            controls.enabled = false;

            updatePlanetMaterialUniforms(planet)
        } 
        // Slowly lerp the camera back to the original position and look at the origin
        else if (attachedObject === null) {
            // Enable controls
            controls.enabled = true;
            let cameraPosition = new THREE.Vector3().set(0, 10, 20);

            camera.position.lerp(cameraPosition, blendingFactor);
            camera.lookAt(0, 0, 0);
        }
    });

    // Gouraud/Phong shading alternately to Planet 2

    if (Math.floor(time) % 2 == 0) { // Even
        planetMesh2.material = createPhongMaterial(planet2attributes)
    }
    else { // Odd
        planetMesh2.material = createGouraudMaterial(planet2attributes)
    }

    // Update customized planet material uniforms
    updatePlanetMaterialUniforms(sunMesh);
    for(let i = 1; i < 4; i++){ // Updates for planets 2 - 4
        updatePlanetMaterialUniforms(planets[i].mesh)
    }
    

    // Update controls only when the camera is not attached
    if (controls.enabled) {
        controls.update();
    }

    renderer.render(scene, camera);
}