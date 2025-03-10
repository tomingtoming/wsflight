// filepath: /Users/toming/wsflight/src/physics/environment/PhysicsEnvironment.ts
import { Vector3, IPhysicsEnvironment, AtmosphericData } from '../types';

/**
 * 物理環境を管理するクラス
 * 大気密度や風などの環境要素を計算する
 */
export class PhysicsEnvironment implements IPhysicsEnvironment {
    private gravity: number = 9.81; // m/s^2
    private windEnabled: boolean = false;
    private windVector: Vector3 = { x: 0, y: 0, z: 0 };
    
    constructor(options?: { gravity?: number, windEnabled?: boolean }) {
        if (options) {
            if (options.gravity !== undefined) this.gravity = options.gravity;
            if (options.windEnabled !== undefined) this.windEnabled = options.windEnabled;
        }
    }
    
    /**
     * 大気密度の計算（YSFLIGHTのfsairproperty.cppを参考に）
     * @param altitude 高度（メートル）
     * @returns 大気密度（kg/m^3）
     */
    public getAirDensity(altitude: number): number {
        const rhoTab = [
            1.224991,  //     0m
            0.819122,  //  4000m
            0.529999,  //  8000m
            0.299988,  // 12000m
            0.153000,  // 16000m
            0.084991   // 20000m
        ];
        
        const a = Math.floor(altitude / 4000.0);
        if (a < 0) return rhoTab[0];
        if (a > 4) return rhoTab[5];
        
        // 線形補間
        const base = rhoTab[a];
        const diff = rhoTab[a + 1] - rhoTab[a];
        const t = (altitude - 4000.0 * a) / 4000.0;
        return base + diff * t;
    }
    
    /**
     * マッハ1の速度を計算（YSFLIGHTのfsairproperty.cppを参考に）
     * @param altitude 高度（メートル）
     * @returns 音速（m/s）
     */
    public getMachOne(altitude: number): number {
        const machTab = [
            340.294,  //     0m
            324.579,  //  4000m
            308.063,  //  8000m
            295.069,  // 12000m
            295.069,  // 16000m
            295.069   // 20000m
        ];
        
        const a = Math.floor(altitude / 4000.0);
        if (a < 0) return machTab[0];
        if (a > 4) return machTab[4];
        
        // 線形補間
        const base = machTab[a];
        const diff = machTab[a + 1] - machTab[a];
        const t = (altitude - 4000.0 * a) / 4000.0;
        return base + diff * t;
    }
    
    /**
     * 重力加速度を取得する
     * @returns 重力加速度（m/s^2）
     */
    public getGravity(): number {
        return this.gravity;
    }
    
    /**
     * 風ベクトルを取得する
     * @param position 位置（高度によって風が変化する場合に使用）
     * @returns 風ベクトル（m/s）
     */
    public getWind(position: Vector3): Vector3 {
        if (!this.windEnabled) {
            return { x: 0, y: 0, z: 0 };
        }
        
        // 将来的には、位置に応じた風の変化を実装可能
        return { ...this.windVector };
    }
    
    /**
     * 風を設定する
     * @param windVector 風ベクトル（m/s）
     * @param enabled 風を有効にするか
     */
    public setWind(windVector: Vector3, enabled: boolean = true): void {
        this.windVector = { ...windVector };
        this.windEnabled = enabled;
    }
    
    /**
     * 特定高度での大気データを取得
     * @param altitude 高度（メートル）
     * @returns 大気データ（密度、音速、温度）
     */
    public getAtmosphericData(altitude: number): AtmosphericData {
        const density = this.getAirDensity(altitude);
        const machOne = this.getMachOne(altitude);
        
        // 温度は音速から逆算（T = c^2 * M / (gamma * R)）
        // ここではγ=1.4、R=287.05 J/(kg·K)と仮定
        const gamma = 1.4;
        const R = 287.05;
        const temperature = Math.pow(machOne, 2) * 0.029 / (gamma * R);
        
        return {
            density,
            machOne,
            temperature
        };
    }
}