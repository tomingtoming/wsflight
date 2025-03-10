// filepath: /Users/toming/wsflight/src/core/models/ModelManager.ts
import * as THREE from 'three';
import { IModelManager } from '../../physics/types';
import { DNMLoader } from './loaders/DNMLoader';
import { SRFLoader } from './loaders/SRFLoader';

/**
 * 3Dモデルの読み込みと管理を行うクラス
 */
export class ModelManager implements IModelManager {
    private modelCache: Map<string, THREE.Group>;
    private textureCache: Map<string, THREE.Texture>;
    
    private dnmLoader: DNMLoader;
    private srfLoader: SRFLoader;
    
    constructor() {
        this.modelCache = new Map();
        this.textureCache = new Map();
        
        this.dnmLoader = new DNMLoader();
        this.srfLoader = new SRFLoader();
    }
    
    /**
     * YSFLIGHTのDNM（Dynamic Model）ファイルを読み込む
     * @param url DNMファイルのURL
     * @param useCache キャッシュを使用するかどうか（デフォルト: true）
     * @returns 読み込まれたモデルのGroup
     */
    public async loadDNM(url: string, useCache: boolean = true): Promise<THREE.Group> {
        // キャッシュにある場合はキャッシュから返す
        if (useCache && this.modelCache.has(url)) {
            const cachedModel = this.modelCache.get(url);
            if (cachedModel) {
                // キャッシュからクローンを作成して返す
                return cachedModel.clone();
            }
        }
        
        try {
            // DNMモデルを読み込む
            const model = await this.dnmLoader.load(url);
            
            // キャッシュに保存
            if (useCache) {
                this.modelCache.set(url, model.clone());
            }
            
            return model;
        } catch (error) {
            console.error(`Failed to load DNM model: ${url}`, error);
            return new THREE.Group(); // 空のグループを返す
        }
    }
    
    /**
     * YSFLIGHTのSRF（Surface）ファイルを読み込む
     * @param url SRFファイルのURL
     * @param useCache キャッシュを使用するかどうか（デフォルト: true）
     * @returns 読み込まれたモデル
     */
    public async loadSRF(url: string, useCache: boolean = true): Promise<THREE.Group> {
        // キャッシュにある場合はキャッシュから返す
        if (useCache && this.modelCache.has(url)) {
            const cachedModel = this.modelCache.get(url);
            if (cachedModel) {
                // キャッシュからクローンを作成して返す
                return cachedModel.clone();
            }
        }
        
        try {
            // SRFモデルを読み込む
            const model = await this.srfLoader.load(url);
            
            // キャッシュに保存
            if (useCache) {
                this.modelCache.set(url, model.clone());
            }
            
            return model;
        } catch (error) {
            console.error(`Failed to load SRF model: ${url}`, error);
            return new THREE.Group(); // 空のグループを返す
        }
    }
    
    /**
     * テクスチャを読み込む
     * @param url テクスチャのURL
     * @param useCache キャッシュを使用するかどうか（デフォルト: true）
     * @returns 読み込まれたテクスチャ
     */
    public async loadTexture(url: string, useCache: boolean = true): Promise<THREE.Texture> {
        // キャッシュにある場合はキャッシュから返す
        if (useCache && this.textureCache.has(url)) {
            const cachedTexture = this.textureCache.get(url);
            if (cachedTexture) {
                return cachedTexture.clone();
            }
        }
        
        return new Promise((resolve, reject) => {
            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(
                url,
                (texture) => {
                    // テクスチャ読み込み成功
                    if (useCache) {
                        this.textureCache.set(url, texture.clone());
                    }
                    resolve(texture);
                },
                undefined, // プログレスコールバック
                (error) => {
                    // エラー時
                    console.error(`Failed to load texture: ${url}`, error);
                    reject(error);
                }
            );
        });
    }
    
    /**
     * モデルにテクスチャを適用する
     * @param model 対象のモデル
     * @param texturePath テクスチャパス
     */
    public async applyTexture(model: THREE.Group, texturePath: string): Promise<void> {
        try {
            const texture = await this.loadTexture(texturePath);
            
            // モデル内のすべてのメッシュにテクスチャを適用
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    // MeshPhongMaterialに変換または設定
                    let material: THREE.MeshPhongMaterial;
                    
                    if (!(child.material instanceof THREE.MeshPhongMaterial)) {
                        material = new THREE.MeshPhongMaterial();
                        child.material = material;
                    } else {
                        material = child.material as THREE.MeshPhongMaterial;
                    }
                    
                    // テクスチャを設定
                    material.map = texture;
                    material.needsUpdate = true;
                }
            });
        } catch (error) {
            console.error('Error applying texture:', error);
        }
    }
    
    /**
     * キャッシュをクリアする
     */
    public clearCache(): void {
        this.modelCache.clear();
        this.textureCache.clear();
    }
    
    /**
     * YSFLIGHTのノードを回転させる
     * @param model DNMモデルのルートグループ
     * @param nodeName 回転させるノードの名前
     * @param angle 回転角度（ラジアン）
     */
    public rotateNode(model: THREE.Group, nodeName: string, angle: number): void {
        this.dnmLoader.rotateNode(model, nodeName, angle);
    }
    
    /**
     * 機体の基本モデルを生成する（テスト用）
     * @returns 簡易的な航空機モデル
     */
    public createBasicAircraftModel(): THREE.Group {
        const group = new THREE.Group();
        
        // 機体本体（胴体）
        const fuselageGeometry = new THREE.CylinderGeometry(1.5, 1, 15, 16);
        const fuselageMaterial = new THREE.MeshPhongMaterial({ color: 0x2E4053 }); // ダークブルー
        const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
        fuselage.rotation.z = Math.PI / 2;
        
        // コックピット
        const cockpitGeometry = new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const cockpitMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x85C1E9, 
            transparent: true, 
            opacity: 0.7 
        });
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(5, 1, 0);
        cockpit.rotation.z = -Math.PI / 2;
        
        // 主翼
        const wingGeometry = new THREE.BoxGeometry(20, 0.5, 6);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x2E4053 });
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        wing.position.y = 0;
        
        // 水平尾翼
        const tailWingGeometry = new THREE.BoxGeometry(8, 0.3, 3);
        const tailWingMaterial = new THREE.MeshPhongMaterial({ color: 0x2E4053 });
        const tailWing = new THREE.Mesh(tailWingGeometry, tailWingMaterial);
        tailWing.position.set(-6, 0, 0);
        
        // 垂直尾翼
        const tailFinGeometry = new THREE.BoxGeometry(4, 3, 0.3);
        const tailFinMaterial = new THREE.MeshPhongMaterial({ color: 0x2E4053 });
        const tailFin = new THREE.Mesh(tailFinGeometry, tailFinMaterial);
        tailFin.position.set(-6, 1.5, 0);
        
        // エンジンノズル
        const nozzleGeometry = new THREE.CylinderGeometry(0.8, 1, 2, 16);
        const nozzleMaterial = new THREE.MeshPhongMaterial({ color: 0x7F8C8D });
        const nozzleLeft = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzleLeft.position.set(-7.5, 0, 1);
        nozzleLeft.rotation.z = Math.PI / 2;
        
        const nozzleRight = nozzleGeometry.clone();
        const nozzleRightMesh = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzleRightMesh.position.set(-7.5, 0, -1);
        nozzleRightMesh.rotation.z = Math.PI / 2;
        
        // 機体に各パーツを追加
        group.add(fuselage);
        group.add(cockpit);
        group.add(wing);
        group.add(tailWing);
        group.add(tailFin);
        group.add(nozzleLeft);
        group.add(nozzleRightMesh);
        
        group.name = "BasicAircraft";
        
        return group;
    }
}