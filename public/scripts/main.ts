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

    // デモモード関連
    private isDemo: boolean = true;
    private demoTimer: number = 0;
    private demoFlightPath: {position: THREE.Vector3, rotation: THREE.Euler}[] = [];
    private demoPathIndex: number = 0;
    private demoPathT: number = 0;

    // カメラモード（YSFLIGHTと同様）
    private cameraMode: number = 0; // 0: コックピット, 1: 外部視点, 2: 追跡, 3: タワー
    private cameraPositions = [
        { pos: new THREE.Vector3(0, 1.5, 0), lookAt: new THREE.Vector3(0, 1.5, 10) },  // コックピット
        { pos: new THREE.Vector3(0, 10, -30), lookAt: new THREE.Vector3(0, 0, 0) },     // 外部視点
        { pos: new THREE.Vector3(0, 15, -50), lookAt: new THREE.Vector3(0, 0, 0) },     // 追跡
        { pos: new THREE.Vector3(200, 50, 200), lookAt: new THREE.Vector3(0, 0, 0) }    // タワー
    ];

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

        // OrbitControlsはデモモードでのみ有効
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enabled = this.isDemo;
        
        this.aircraft = new Aircraft();
        
        this.aircraftMesh = new THREE.Group();
        this.createAircraftMesh();
        this.scene.add(this.aircraftMesh);
        
        this.createTerrain();
        this.addLights();
        this.setupEventListeners();
        this.createDemoFlightPath();

        this.animate();
    }

    private createDemoFlightPath(): void {
        // デモ飛行の経路を作成（円形の経路+いくつかの上下左右の動き）
        const radius = 500;
        const height = 100;
        const segments = 100;

        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 4; // 2周
            const x = radius * Math.cos(theta);
            const z = radius * Math.sin(theta);
            
            // 高度は周期的に変化
            const y = height + Math.sin(theta * 2) * 50;
            
            // 位置
            const position = new THREE.Vector3(x, y, z);
            
            // 機首方向（接線方向）
            const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
            
            // 姿勢（接線方向へ向ける）
            const rotation = new THREE.Euler(
                Math.sin(theta * 3) * 0.2, // ピッチは周期的に上下
                Math.atan2(-tangent.x, tangent.z), // 進行方向を向く
                Math.sin(theta * 2) * 0.3 // ロールは周期的に左右
            );
            
            this.demoFlightPath.push({position, rotation});
        }
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
        const geometry = new THREE.PlaneGeometry(10000, 10000, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3c8f3c,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        this.scene.add(plane);

        // グリッド追加
        const grid = new THREE.GridHelper(10000, 50, 0x000000, 0x000000);
        grid.position.y = 0.1; // 地面の上にわずかに浮かせる
        this.scene.add(grid);

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
        // デモモード中はスペースキーで実際のゲームを開始
        if (this.isDemo && event.code === 'Space') {
            this.startGame();
            return;
        }

        // デモモード中は他のキー入力を無視
        if (this.isDemo) return;

        // YSFLIGHTに近いキーバインディング
        switch(event.code) {
            // 機体操作
            case 'ArrowUp': // エレベータ上（機首下げ）
                this.aircraft.setControls({ elevator: -1 });
                break;
            case 'ArrowDown': // エレベータ下（機首上げ）
                this.aircraft.setControls({ elevator: 1 });
                break;
            case 'ArrowLeft': // エルロン左（左ロール）
                this.aircraft.setControls({ aileron: -1 });
                break;
            case 'ArrowRight': // エルロン右（右ロール）
                this.aircraft.setControls({ aileron: 1 });
                break;
            case 'KeyA': // ラダー左
                this.aircraft.setControls({ rudder: -1 });
                break;
            case 'KeyD': // ラダー右
                this.aircraft.setControls({ rudder: 1 });
                break;
            case 'KeyW': // スロットル最大
                this.aircraft.setThrottle(1.0);
                break;
            case 'KeyS': // スロットル最小
                this.aircraft.setThrottle(0.0);
                break;
            
            // 視点切替
            case 'KeyC': // カメラモード切替
                this.cycleCamera();
                break;
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        // デモモード中はキー入力を無視
        if (this.isDemo) return;

        switch(event.code) {
            case 'ArrowUp':
            case 'ArrowDown':
                this.aircraft.setControls({ elevator: 0 });
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                this.aircraft.setControls({ aileron: 0 });
                break;
            case 'KeyA':
            case 'KeyD':
                this.aircraft.setControls({ rudder: 0 });
                break;
        }
    }

    private startGame(): void {
        this.isDemo = false;
        this.controls.enabled = false;
        
        // 飛行機の位置とカメラをリセット
        this.aircraft = new Aircraft();
        this.aircraft.setPosition({ x: 0, y: 20, z: 0 });
        this.updateAircraftPosition();
        
        // カメラを設定
        this.setCameraMode(0); // コックピットビューから開始
        
        // デモ画面の表示を消す
        this.updateDemoScreen(false);
    }

    private cycleCamera(): void {
        this.cameraMode = (this.cameraMode + 1) % this.cameraPositions.length;
        this.setCameraMode(this.cameraMode);
    }

    private setCameraMode(mode: number): void {
        this.cameraMode = mode;
    }
    
    private updateCameraPosition(): void {
        if (this.isDemo) return; // デモモード中はカメラは自動制御
        
        const pos = this.aircraftMesh.position.clone();
        const aircraftRotation = this.aircraftMesh.rotation.clone();
        
        switch(this.cameraMode) {
            case 0: // コックピットビュー
                // 機体のローカル座標系での相対位置
                const cameraOffset = new THREE.Vector3(0, 1.5, 0);
                cameraOffset.applyEuler(aircraftRotation);
                
                // 機体位置 + 相対位置
                this.camera.position.copy(pos.add(cameraOffset));
                
                // 前方を向く
                const lookAtOffset = new THREE.Vector3(0, 1.5, 10);
                lookAtOffset.applyEuler(aircraftRotation);
                this.camera.lookAt(this.aircraftMesh.position.clone().add(lookAtOffset));
                break;
            
            case 1: // 外部視点
                const externalPos = new THREE.Vector3(0, 10, -30);
                externalPos.applyEuler(aircraftRotation);
                this.camera.position.copy(this.aircraftMesh.position.clone().add(externalPos));
                this.camera.lookAt(this.aircraftMesh.position);
                break;
            
            case 2: // 追跡
                const chasePos = new THREE.Vector3(0, 15, -50);
                this.camera.position.copy(this.aircraftMesh.position.clone().add(chasePos));
                this.camera.lookAt(this.aircraftMesh.position);
                break;
            
            case 3: // タワー
                this.camera.position.set(200, 50, 200);
                this.camera.lookAt(this.aircraftMesh.position);
                break;
        }
    }

    private onWindowResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private updateDemoFlightPath(dt: number): void {
        if (!this.isDemo) return;
        
        // デモでの飛行パスをたどる
        this.demoPathT += dt * 0.2; // 補間速度
        
        if (this.demoPathT >= 1) {
            this.demoPathT = 0;
            this.demoPathIndex = (this.demoPathIndex + 1) % (this.demoFlightPath.length - 1);
        }
        
        // 現在のパスセグメントと次のセグメント
        const current = this.demoFlightPath[this.demoPathIndex];
        const next = this.demoFlightPath[this.demoPathIndex + 1];
        
        // 位置の線形補間
        const position = new THREE.Vector3().lerpVectors(
            current.position, 
            next.position, 
            this.demoPathT
        );
        
        // オイラー角の球面線形補間（簡易版）
        const rotation = new THREE.Euler(
            current.rotation.x + (next.rotation.x - current.rotation.x) * this.demoPathT,
            current.rotation.y + (next.rotation.y - current.rotation.y) * this.demoPathT,
            current.rotation.z + (next.rotation.z - current.rotation.z) * this.demoPathT
        );
        
        // 航空機の位置と姿勢を更新
        this.aircraftMesh.position.copy(position);
        this.aircraftMesh.rotation.copy(rotation);
    }

    private updateAircraftPosition(): void {
        if (this.isDemo) return; // デモモード中は他の方法で制御
        
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
        
        if (this.isDemo) {
            // デモモード中はタイトルと説明を表示
            this.updateDemoScreen(true);
            return;
        }

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
        
        // カメラモード表示
        const cameraElement = document.createElement('div');
        cameraElement.className = 'hud-item camera-mode';
        const cameraModes = ['Cockpit', 'External', 'Chase', 'Tower'];
        cameraElement.textContent = `View: ${cameraModes[this.cameraMode]}`;
        hudElement.appendChild(cameraElement);
    }
    
    private updateDemoScreen(visible: boolean): void {
        const hudElement = document.getElementById('hud');
        if (!hudElement) return;
        
        if (!visible) {
            hudElement.innerHTML = '';
            return;
        }
        
        // タイトル
        const titleElement = document.createElement('div');
        titleElement.className = 'demo-title';
        titleElement.textContent = 'WSFlight';
        hudElement.appendChild(titleElement);
        
        // サブタイトル
        const subtitleElement = document.createElement('div');
        subtitleElement.className = 'demo-subtitle';
        subtitleElement.textContent = 'Web Flight Simulator';
        hudElement.appendChild(subtitleElement);
        
        // 説明
        const instructionsElement = document.createElement('div');
        instructionsElement.className = 'demo-instructions';
        instructionsElement.innerHTML = `
            <h3>操作方法</h3>
            <p>矢印キー: ピッチとロール制御</p>
            <p>A/D: ラダー制御</p>
            <p>W/S: スロットル調整</p>
            <p>C: 視点切替</p>
            <p>ESC: メニュー</p>
            <p>&nbsp;</p>
            <p>スペースキーでスタート</p>
        `;
        hudElement.appendChild(instructionsElement);
    }

    animate(): void {
        requestAnimationFrame(() => this.animate());
        
        const dt = 1/60;  // 60FPS想定
        
        if (this.isDemo) {
            // デモモード中の処理
            this.demoTimer += dt;
            this.updateDemoFlightPath(dt);
            this.controls.update();
        } else {
            // 実際のフライトシミュレーション
            this.aircraft.update(dt);
            this.updateAircraftPosition();
            this.updateCameraPosition();
        }
        
        this.createHUD();
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーションの初期化
const simulator = new FlightSimulator();