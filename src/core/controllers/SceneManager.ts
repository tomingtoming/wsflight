// filepath: /Users/toming/wsflight/src/core/controllers/SceneManager.ts
import * as THREE from 'three';
import { Vector3, Attitude, ISceneManager } from '../../physics/types';

/**
 * 3Dシーンを管理するクラス
 * 地形、照明、オブジェクトなどを管理する
 */
export class SceneManager implements ISceneManager {
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private aircraft: THREE.Object3D | null = null;
    
    /**
     * シーンマネージャーを初期化
     * @param renderer Three.jsレンダラー
     */
    constructor(renderer: THREE.WebGLRenderer) {
        this.scene = new THREE.Scene();
        this.renderer = renderer;
        
        // 背景色の設定
        this.scene.background = new THREE.Color(0x87CEEB); // 空色
    }
    
    /**
     * 基本的なシーンを作成
     */
    public createScene(): void {
        this.addLights();
        this.createTerrain();
    }
    
    /**
     * 航空機モデルをシーンに追加
     * @param aircraft 航空機の3Dモデル
     */
    public addAircraft(aircraft: THREE.Object3D): void {
        if (this.aircraft) {
            this.scene.remove(this.aircraft);
        }
        
        this.aircraft = aircraft;
        this.scene.add(this.aircraft);
    }
    
    /**
     * 航空機の位置と姿勢を更新
     * @param position 位置ベクトル
     * @param rotation 回転（姿勢）
     */
    public updateAircraftPosition(position: Vector3, rotation: Attitude): void {
        if (!this.aircraft) return;
        
        this.aircraft.position.set(position.x, position.y, position.z);
        this.aircraft.rotation.set(rotation.pitch, rotation.yaw, rotation.roll);
    }
    
    /**
     * シーンをレンダリング
     * @param camera 使用するカメラ
     */
    public render(camera: THREE.Camera): void {
        this.renderer.render(this.scene, camera);
    }
    
    /**
     * ウィンドウサイズ変更時の処理
     */
    public resize(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }
    
    /**
     * シーンにアクセス（高度な操作用）
     * @returns Three.jsシーンオブジェクト
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }
    
    /**
     * 照明を追加
     */
    private addLights(): void {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // 太陽光（指向性ライト）
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(100, 100, 0);
        sunLight.castShadow = true;
        
        // シャドウマップの設定
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -200;
        sunLight.shadow.camera.right = 200;
        sunLight.shadow.camera.top = 200;
        sunLight.shadow.camera.bottom = -200;
        
        this.scene.add(sunLight);
    }
    
    /**
     * 基本的な地形を作成
     */
    private createTerrain(): void {
        // 地面の平面
        const geometry = new THREE.PlaneGeometry(10000, 10000, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3c8f3c,
            side: THREE.DoubleSide
        });
        
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);
        
        // グリッド追加
        const grid = new THREE.GridHelper(10000, 50, 0x000000, 0x000000);
        grid.position.y = 0.1; // 地面の上にわずかに浮かせる
        this.scene.add(grid);
        
        // 軸ヘルパー
        const axesHelper = new THREE.AxesHelper(1000);
        this.scene.add(axesHelper);
    }
    
    /**
     * スカイボックスを作成
     * @param texturePath テクスチャパス（キューブマップ用）
     */
    public createSkybox(texturePath: string): void {
        const loader = new THREE.CubeTextureLoader();
        
        // キューブマップのテクスチャ読み込み
        loader.load([
            texturePath + 'px.jpg', // positive x
            texturePath + 'nx.jpg', // negative x
            texturePath + 'py.jpg', // positive y
            texturePath + 'ny.jpg', // negative y
            texturePath + 'pz.jpg', // positive z
            texturePath + 'nz.jpg'  // negative z
        ], (texture) => {
            this.scene.background = texture;
        });
    }
    
    /**
     * 霧を追加
     * @param color 霧の色
     * @param near 霧の開始距離
     * @param far 霧の終了距離
     */
    public addFog(color: number = 0xcccccc, near: number = 100, far: number = 5000): void {
        this.scene.fog = new THREE.Fog(color, near, far);
    }
    
    /**
     * モデルをシーンに追加
     * @param model 3Dモデル
     * @param position 位置
     */
    public addModel(model: THREE.Object3D, position: Vector3): void {
        model.position.set(position.x, position.y, position.z);
        this.scene.add(model);
    }
}