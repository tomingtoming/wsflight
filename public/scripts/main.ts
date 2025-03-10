import * as THREE from 'three';
import { Aircraft } from '../../src/physics/Aircraft';
import { CameraController } from '../../src/core/controllers/CameraController';
import { HUDManager } from '../../src/core/ui/HUDManager';
import { InputHandler } from '../../src/core/controllers/InputHandler';
import { SceneManager } from '../../src/core/controllers/SceneManager';
import { ModelManager } from '../../src/core/models/ModelManager';
import { AircraftData, CameraMode } from '../../src/physics/types';

/**
 * フライトシミュレータのメインクラス
 * 各モジュール化されたコンポーネントを統合し、管理する
 */
class FlightSimulator {
    // コアコンポーネント
    private aircraft: Aircraft;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    
    // モジュール化されたコンポーネント
    private cameraController: CameraController;
    private hudManager: HUDManager;
    private inputHandler: InputHandler;
    private sceneManager: SceneManager;
    private modelManager: ModelManager;
    
    // 3Dモデル
    private aircraftMesh: THREE.Group;
    
    // YSFLIGHTモデル関連
    private ysfModels: {
        f18: THREE.Group | null;
        f18cockpit: THREE.Group | null;
        f18coll: THREE.Group | null;
    };
    
    // デモモード関連
    private isDemo: boolean = true;
    private demoTimer: number = 0;
    private demoFlightPath: {position: THREE.Vector3, rotation: THREE.Euler}[] = [];
    private demoPathIndex: number = 0;
    private demoPathT: number = 0;
    
    /**
     * FlightSimulatorを初期化
     */
    constructor() {
        // Three.js基本セットアップ
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
        
        // 各コンポーネントの初期化
        this.aircraft = new Aircraft();
        this.sceneManager = new SceneManager(this.renderer);
        this.cameraController = new CameraController(this.camera, this.renderer);
        this.hudManager = new HUDManager('hud');
        this.modelManager = new ModelManager(); // モデルマネージャーを初期化
        
        this.inputHandler = new InputHandler(
            this.renderer.domElement as HTMLCanvasElement,
            this.aircraft,
            this.cameraController
        );
        
        // デモモードの初期設定
        this.cameraController.setDemoMode(this.isDemo);
        this.inputHandler.setDemo(this.isDemo);
        
        // YSFLIGHTモデル初期化
        this.ysfModels = {
            f18: null,
            f18cockpit: null,
            f18coll: null
        };
        
        // 航空機モデルの初期作成
        this.aircraftMesh = this.modelManager.createBasicAircraftModel();
        
        // シーンの初期化と機体モデルの追加
        this.sceneManager.createScene();
        this.sceneManager.addAircraft(this.aircraftMesh);
        
        // カメラコントローラーに機体モデルを設定
        this.cameraController.setAircraftMesh(this.aircraftMesh);
        
        // YSFLIGHTのモデルを読み込む
        this.loadYSFLIGHTModels();
        
        // デモフライトパスの作成
        this.createDemoFlightPath();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // デモ画面表示
        this.hudManager.showDemoScreen(true);
        
        // アニメーションループの開始
        this.animate();
    }
    
    /**
     * YSFLIGHTのモデルファイルを読み込む
     */
    private async loadYSFLIGHTModels(): Promise<void> {
        try {
            // F-18の機体モデル（DNMLoader経由でThree.jsのGroupとして取得）
            this.ysfModels.f18 = await this.modelManager.loadDNM('YSFLIGHT/runtime/aircraft/f18/f18.dnm');
            
            // F-18のコックピットモデル（SRFLoader経由）
            this.ysfModels.f18cockpit = await this.modelManager.loadSRF('YSFLIGHT/runtime/aircraft/f18/f18cockpit.srf');
            
            // F-18の衝突判定モデル（SRFLoader経由）
            this.ysfModels.f18coll = await this.modelManager.loadSRF('YSFLIGHT/runtime/aircraft/f18/f18coll.srf');
            
            console.log('YSFLIGHTモデルの読み込みが完了しました');
            
            // テクスチャの適用（もし存在すれば）
            await this.modelManager.applyTexture(this.ysfModels.f18, 'YSFLIGHT/runtime/aircraft/f18/f18.png');
            
            // 読み込んだモデルの配置調整（必要に応じて）
            if (this.ysfModels.f18) {
                // スケールの調整
                this.ysfModels.f18.scale.set(0.1, 0.1, 0.1);
                
                // モデルを非表示にする（デモモード中は基本モデルを使用）
                this.ysfModels.f18.visible = false;
            }
            
        } catch (error) {
            console.error('YSFLIGHTモデルの読み込みに失敗しました:', error);
            this.hudManager.showError('モデルの読み込みに失敗しました');
        }
    }
    
    /**
     * デモ飛行のパスを作成
     */
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
    
    /**
     * イベントリスナーの設定
     */
    private setupEventListeners(): void {
        window.addEventListener('resize', this.handleWindowResize.bind(this), false);
        window.addEventListener('gamestart', this.handleGameStart.bind(this), false);
    }
    
    /**
     * ウィンドウリサイズイベント処理
     */
    private handleWindowResize(): void {
        this.sceneManager.resize();
        this.cameraController.resize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * ゲーム開始イベント処理
     */
    private handleGameStart(): void {
        this.startGame();
    }
    
    /**
     * デモモードからゲーム開始
     */
    private startGame(): void {
        this.isDemo = false;
        
        // 各コンポーネントにデモ終了を通知
        this.cameraController.setDemoMode(false);
        this.inputHandler.setDemo(false);
        
        // 飛行機の位置とカメラをリセット
        this.aircraft = new Aircraft();
        
        // 高度を上げて、初期速度を設定
        this.aircraft.setPosition({ x: 0, y: 200, z: 0 });
        this.aircraft.setVelocity({ x: 50, y: 0, z: 0 }); // 初期速度を設定して飛行状態にする
        this.aircraft.setThrottle(0.8); // スロットルを80%に設定
        
        // YSFLIGHTモデルへ切り替え（読み込みが完了している場合）
        if (this.ysfModels.f18) {
            // 基本モデルを非表示にする
            this.aircraftMesh.visible = false;
            
            // YSFLIGHTモデルを表示してシーンに追加
            this.ysfModels.f18.visible = true;
            this.sceneManager.addAircraft(this.ysfModels.f18);
            
            // カメラコントローラーにYSFLIGHTモデルを設定
            this.cameraController.setAircraftMesh(this.ysfModels.f18);
        }
        
        this.updateAircraftPosition();
        
        // InputHandlerに新しい航空機オブジェクトを設定
        this.inputHandler.setAircraft(this.aircraft);
        
        // カメラを設定
        this.cameraController.setCameraMode(CameraMode.COCKPIT); // コックピットビューから開始
        
        // デモ画面の表示を消す
        this.hudManager.showDemoScreen(false);
        
        // ゲーム開始通知
        this.hudManager.showNotification('フライト開始！');
    }
    
    /**
     * デモフライトパスの更新
     * @param dt 更新時間間隔
     */
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
    
    /**
     * 航空機の位置と姿勢を更新
     */
    private updateAircraftPosition(): void {
        if (this.isDemo) return; // デモモード中は他の方法で制御
        
        const position = this.aircraft.getPosition();
        const rotation = this.aircraft.getRotation();
        
        this.sceneManager.updateAircraftPosition(position, rotation);
        
        // 可動部分の更新（YSFLIGHTモデル使用時）
        if (this.ysfModels.f18) {
            // 例: スロットルに応じてアフターバーナーの表示設定
            const throttle = this.aircraft.getControls().throttle;
            
            // アフターバーナーノードがある場合、回転または表示状態を変更
            if (throttle > 0.9) {
                // アフターバーナー表示など
                this.modelManager.rotateNode(this.ysfModels.f18, "AFTERBURNER", Math.PI * 0.5);
            }
            
            // エレベータの回転
            const elevatorAngle = this.aircraft.getControls().elevator * Math.PI * 0.25; // 最大±45度
            this.modelManager.rotateNode(this.ysfModels.f18, "ELEVATOR", elevatorAngle);
            
            // エルロンの回転
            const aileronLeftAngle = -this.aircraft.getControls().aileron * Math.PI * 0.15;
            const aileronRightAngle = this.aircraft.getControls().aileron * Math.PI * 0.15;
            this.modelManager.rotateNode(this.ysfModels.f18, "L_AILERON", aileronLeftAngle);
            this.modelManager.rotateNode(this.ysfModels.f18, "R_AILERON", aileronRightAngle);
            
            // ラダーの回転
            const rudderAngle = this.aircraft.getControls().rudder * Math.PI * 0.25;
            this.modelManager.rotateNode(this.ysfModels.f18, "RUDDER", rudderAngle);
        }
    }
    
    /**
     * 航空機データの準備
     * @returns HUDに表示するための航空機データ
     */
    private prepareAircraftData(): AircraftData {
        const position = this.aircraft.getPosition();
        const rotation = this.aircraft.getRotation();
        const velocity = this.aircraft.getVelocity();
        const speed = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        return {
            position,
            rotation,
            velocity,
            altitude: position.y,
            speed,
            throttle: this.aircraft.getControls().throttle,
            rpm: this.aircraft.getCurrentRPM(),
            cameraMode: this.cameraController.getCameraMode(),
            mouseJoystickEnabled: this.inputHandler.getMouseControlsEnabled()
        };
    }
    
    /**
     * アニメーションループ
     */
    animate(): void {
        requestAnimationFrame(() => this.animate());
        
        const dt = 1/60;  // 60FPS想定
        
        if (this.isDemo) {
            // デモモード中の処理
            this.demoTimer += dt;
            this.updateDemoFlightPath(dt);
            this.cameraController.updateOrbitControls();
            
            // デモ中にHUDを更新する必要はない
        } else {
            // 実際のフライトシミュレーション
            this.aircraft.update(dt);
            this.updateAircraftPosition();
            this.inputHandler.update();
            this.cameraController.update(this.aircraft);
            
            // HUD更新
            const aircraftData = this.prepareAircraftData();
            this.hudManager.update(aircraftData);
        }
        
        // シーンのレンダリング
        this.sceneManager.render(this.camera);
    }
}

// アプリケーションの初期化
const simulator = new FlightSimulator();