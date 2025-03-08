import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Aircraft } from '../../src/physics/Aircraft.ts';

class FlightSimulator {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private aircraft: Aircraft;
    private aircraftMesh: THREE.Group;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            20000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera.position.set(0, 100, -200);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        this.aircraft = new Aircraft();
        
        this.aircraftMesh = new THREE.Group();
        this.createAircraftMesh();
        this.scene.add(this.aircraftMesh);
        
        this.createTerrain();
        
        this.addLights();

        this.setupEventListeners();

        this.animate();
    }

    private createAircraftMesh(): void {
        const fuselage = new THREE.Mesh(
            new THREE.CylinderGeometry(1, 1, 10, 12),
            new THREE.MeshPhongMaterial({ color: 0x808080 })
        );
        fuselage.rotation.z = Math.PI / 2;

        const wing = new THREE.Mesh(
            new THREE.BoxGeometry(15, 0.5, 3),
            new THREE.MeshPhongMaterial({ color: 0x808080 })
        );
        wing.position.y = 0.5;

        const tailFin = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 3, 2),
            new THREE.MeshPhongMaterial({ color: 0x808080 })
        );
        tailFin.position.set(-5, 1.5, 0);

        const tailWing = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.5, 1),
            new THREE.MeshPhongMaterial({ color: 0x808080 })
        );
        tailWing.position.set(-5, 0.5, 0);

        this.aircraftMesh.add(fuselage);
        this.aircraftMesh.add(wing);
        this.aircraftMesh.add(tailFin);
        this.aircraftMesh.add(tailWing);
    }

    private createTerrain(): void {
        const geometry = new THREE.PlaneGeometry(2000, 2000, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3c8f3c,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);

        const axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(axesHelper);
    }

    private addLights(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(100, 100, 0);
        this.scene.add(sunLight);
    }

    private setupEventListeners(): void {
        window.addEventListener('resize', () => this.onWindowResize(), false);
        window.addEventListener('keydown', (e) => this.handleKeyDown(e), false);
        window.addEventListener('keyup', (e) => this.handleKeyUp(e), false);
    }

    private handleKeyDown(event: KeyboardEvent): void {
        switch(event.code) {
            case 'ArrowUp':
                this.aircraft.setControls({ 
                    elevator: -1 
                });
                break;
            case 'ArrowDown':
                this.aircraft.setControls({ 
                    elevator: 1 
                });
                break;
            case 'ArrowLeft':
                this.aircraft.setControls({ 
                    aileron: -1 
                });
                break;
            case 'ArrowRight':
                this.aircraft.setControls({ 
                    aileron: 1 
                });
                break;
            case 'KeyA':
                this.aircraft.setControls({
                    rudder: -1
                });
                break;
            case 'KeyD':
                this.aircraft.setControls({
                    rudder: 1
                });
                break;
            case 'KeyW':
                this.aircraft.setThrottle(1.0);
                break;
            case 'KeyS':
                this.aircraft.setThrottle(0.0);
                break;
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        switch(event.code) {
            case 'ArrowUp':
            case 'ArrowDown':
                this.aircraft.setControls({ 
                    elevator: 0 
                });
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                this.aircraft.setControls({ 
                    aileron: 0 
                });
                break;
            case 'KeyA':
            case 'KeyD':
                this.aircraft.setControls({
                    rudder: 0
                });
                break;
        }
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updateAircraftPosition(): void {
        const position = this.aircraft.getPosition();
        const rotation = this.aircraft.getRotation();

        this.aircraftMesh.position.set(position.x, position.y, position.z);
        this.aircraftMesh.rotation.set(rotation.pitch, rotation.yaw, rotation.roll);
    }

    private createHUD(): void {
        // HUDコンテナを取得
        const hudElement = document.getElementById('hud');
        if (!hudElement) return;

        // 現在のHUDをクリア
        hudElement.innerHTML = '';

        // 速度と高度の表示を追加
        const velocity = this.aircraft.getVelocity();
        const speed = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );

        const airspeedElement = document.createElement('div');
        airspeedElement.className = 'hud-item airspeed';
        airspeedElement.textContent = `Speed: ${Math.round(speed * 3.6)} km/h`; // m/s to km/h
        hudElement.appendChild(airspeedElement);

        const altitudeElement = document.createElement('div');
        altitudeElement.className = 'hud-item altitude';
        altitudeElement.textContent = `Alt: ${Math.round(this.aircraft.getPosition().y)} m`;
        hudElement.appendChild(altitudeElement);

        // RPM表示
        const rpmElement = document.createElement('div');
        rpmElement.className = 'hud-item rpm';
        rpmElement.textContent = `RPM: ${Math.round(this.aircraft.getCurrentRPM())}`;
        hudElement.appendChild(rpmElement);
    }

    animate(): void {
        requestAnimationFrame(() => this.animate());
        
        this.aircraft.update(1/60);  // 60FPS想定
        
        this.updateAircraftPosition();
        this.createHUD();
        
        this.controls.update();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーションの初期化
const simulator = new FlightSimulator();