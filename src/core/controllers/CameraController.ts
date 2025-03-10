// filepath: /Users/toming/wsflight/src/core/controllers/CameraController.ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ICameraController, CameraMode, Vector3, Attitude, Aircraft } from '../../physics/types';

/**
 * カメラの動作を制御するクラス
 * YSFLIGHTと同様の視点モードを提供する
 */
export class CameraController implements ICameraController {
    private camera: THREE.PerspectiveCamera;
    private orbitControls: OrbitControls | null = null;
    private currentMode: CameraMode = CameraMode.COCKPIT;
    private aircraftMesh: THREE.Object3D | null = null;
    private isDemo: boolean = false;
    
    // カメラモードごとの相対位置と注視点
    private cameraPositions = {
        [CameraMode.COCKPIT]: { 
            pos: new THREE.Vector3(0, 1.5, 0), 
            lookAt: new THREE.Vector3(0, 1.5, 10) 
        },
        [CameraMode.EXTERNAL]: { 
            pos: new THREE.Vector3(0, 10, -30), 
            lookAt: new THREE.Vector3(0, 0, 0) 
        },
        [CameraMode.CHASE]: { 
            pos: new THREE.Vector3(0, 15, -50), 
            lookAt: new THREE.Vector3(0, 0, 0) 
        },
        [CameraMode.TOWER]: { 
            pos: new THREE.Vector3(200, 50, 200), 
            lookAt: new THREE.Vector3(0, 0, 0) 
        }
    };
    
    /**
     * カメラコントローラーを初期化する
     * @param camera Three.jsのカメラオブジェクト
     * @param renderer Three.jsのレンダラー（OrbitControlsに必要）
     */
    constructor(camera: THREE.PerspectiveCamera, renderer?: THREE.WebGLRenderer) {
        this.camera = camera;
        
        // OrbitControlsの初期化（オプショナル）
        if (renderer) {
            this.orbitControls = new OrbitControls(this.camera, renderer.domElement);
            this.orbitControls.enabled = false;
        }
    }
    
    /**
     * 機体メッシュを設定する
     * @param mesh 機体の3Dメッシュ
     */
    public setAircraftMesh(mesh: THREE.Object3D): void {
        this.aircraftMesh = mesh;
    }
    
    /**
     * デモモードを設定する
     * @param isDemo デモモードかどうか
     */
    public setDemoMode(isDemo: boolean): void {
        this.isDemo = isDemo;
        if (this.orbitControls) {
            this.orbitControls.enabled = isDemo;
        }
    }
    
    /**
     * カメラモードを設定する
     * @param mode カメラモード
     */
    public setCameraMode(mode: CameraMode): void {
        this.currentMode = mode;
    }
    
    /**
     * 現在のカメラモードを取得する
     * @returns 現在のカメラモード
     */
    public getCameraMode(): CameraMode {
        return this.currentMode;
    }
    
    /**
     * カメラを次のモードに切り替える
     */
    public cycleCamera(): void {
        const nextMode = (this.currentMode + 1) % 4;
        this.setCameraMode(nextMode);
    }
    
    /**
     * カメラの位置と視点を更新する
     * @param aircraft 航空機オブジェクト
     */
    public update(aircraft: Aircraft): void {
        if (this.isDemo || !this.aircraftMesh) {
            return;
        }
        
        const pos = this.aircraftMesh.position.clone();
        const aircraftRotation = this.aircraftMesh.rotation.clone();
        
        switch(this.currentMode) {
            case CameraMode.COCKPIT:
                // 機体のローカル座標系での相対位置
                const cameraOffset = new THREE.Vector3(0, 1.5, 0);
                cameraOffset.applyEuler(aircraftRotation);
                
                // 機体位置 + 相対位置
                this.camera.position.copy(pos.clone().add(cameraOffset));
                
                // 前方を向く
                const lookAtOffset = new THREE.Vector3(0, 1.5, 10);
                lookAtOffset.applyEuler(aircraftRotation);
                this.camera.lookAt(this.aircraftMesh.position.clone().add(lookAtOffset));
                break;
            
            case CameraMode.EXTERNAL:
                const externalPos = new THREE.Vector3(0, 10, -30);
                externalPos.applyEuler(aircraftRotation);
                this.camera.position.copy(this.aircraftMesh.position.clone().add(externalPos));
                this.camera.lookAt(this.aircraftMesh.position);
                break;
            
            case CameraMode.CHASE:
                const chasePos = new THREE.Vector3(0, 15, -50);
                this.camera.position.copy(this.aircraftMesh.position.clone().add(chasePos));
                this.camera.lookAt(this.aircraftMesh.position);
                break;
            
            case CameraMode.TOWER:
                this.camera.position.set(200, 50, 200);
                this.camera.lookAt(this.aircraftMesh.position);
                break;
        }
    }
    
    /**
     * ウィンドウサイズ変更時の処理
     * @param width 新しい幅
     * @param height 新しい高さ
     */
    public resize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * OrbitControlsの更新（デモモード時）
     */
    public updateOrbitControls(): void {
        if (this.orbitControls && this.isDemo) {
            this.orbitControls.update();
        }
    }
}