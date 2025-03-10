// filepath: /Users/toming/wsflight/src/core/ui/HUDManager.ts
import { IHUDManager, AircraftData, CameraMode } from '../../physics/types';

/**
 * ヘッドアップディスプレイ（HUD）を管理するクラス
 * 機体情報やデモ画面の表示を制御する
 */
export class HUDManager implements IHUDManager {
    private hudElement: HTMLElement | null = null;
    private visible: boolean = true;
    
    /**
     * HUDマネージャーを初期化する
     * @param elementId HUD要素のID
     */
    constructor(elementId: string = 'hud') {
        this.hudElement = document.getElementById(elementId);
    }
    
    /**
     * HUDの表示/非表示を設定
     * @param visible 表示するかどうか
     */
    public setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.hudElement) {
            this.hudElement.style.display = visible ? 'block' : 'none';
        }
    }
    
    /**
     * デモ画面の表示/非表示を設定
     * @param visible 表示するかどうか
     */
    public showDemoScreen(visible: boolean): void {
        if (!this.hudElement || !this.visible) return;
        
        // 現在のHUDをクリア
        this.hudElement.innerHTML = '';
        
        if (!visible) return;
        
        // タイトル
        const titleElement = document.createElement('div');
        titleElement.className = 'demo-title';
        titleElement.textContent = 'WSFlight';
        this.hudElement.appendChild(titleElement);
        
        // サブタイトル
        const subtitleElement = document.createElement('div');
        subtitleElement.className = 'demo-subtitle';
        subtitleElement.textContent = 'Web Flight Simulator';
        this.hudElement.appendChild(subtitleElement);
        
        // 説明
        const instructionsElement = document.createElement('div');
        instructionsElement.className = 'demo-instructions';
        instructionsElement.innerHTML = `
            <h3>操作方法</h3>
            <p>矢印キー: ピッチとロール制御</p>
            <p>Z/C: ラダー制御</p>
            <p>Q/A: スロットル調整</p>
            <p>F1-F4: 視点切替</p>
            <p>M: マウスジョイスティック切替</p>
            <p>G: 着陸装置</p>
            <p>B: ブレーキ</p>
            <p>&nbsp;</p>
            <p>スペースキーでスタート</p>
        `;
        this.hudElement.appendChild(instructionsElement);
    }
    
    /**
     * HUDを更新する
     * @param aircraftData 航空機データ
     */
    public update(aircraftData: AircraftData): void {
        if (!this.hudElement || !this.visible) return;
        
        // 現在のHUDをクリア
        this.hudElement.innerHTML = '';
        
        // 速度表示
        const airspeedElement = document.createElement('div');
        airspeedElement.className = 'hud-item airspeed';
        airspeedElement.textContent = `Speed: ${Math.round(aircraftData.speed * 3.6)} km/h`; // m/s to km/h
        this.hudElement.appendChild(airspeedElement);
        
        // 高度表示
        const altitudeElement = document.createElement('div');
        altitudeElement.className = 'hud-item altitude';
        altitudeElement.textContent = `Alt: ${Math.round(aircraftData.altitude)} m`;
        this.hudElement.appendChild(altitudeElement);
        
        // RPM表示
        const rpmElement = document.createElement('div');
        rpmElement.className = 'hud-item rpm';
        rpmElement.textContent = `RPM: ${Math.round(aircraftData.rpm)}`;
        this.hudElement.appendChild(rpmElement);
        
        // スロットル表示
        const throttleElement = document.createElement('div');
        throttleElement.className = 'hud-item throttle';
        throttleElement.textContent = `Throttle: ${Math.round(aircraftData.throttle * 100)}%`;
        this.hudElement.appendChild(throttleElement);
        
        // カメラモード表示
        const cameraElement = document.createElement('div');
        cameraElement.className = 'hud-item camera-mode';
        const cameraModes = ['Cockpit', 'External', 'Chase', 'Tower'];
        cameraElement.textContent = `View: ${cameraModes[aircraftData.cameraMode]}`;
        this.hudElement.appendChild(cameraElement);
        
        // マウスジョイスティックモード表示
        if (aircraftData.mouseJoystickEnabled) {
            const mouseJoystickElement = document.createElement('div');
            mouseJoystickElement.className = 'hud-item mouse-joystick';
            mouseJoystickElement.textContent = 'Mouse Joystick: ON';
            this.hudElement.appendChild(mouseJoystickElement);
        }
        
        // 座標表示（デバッグ用）
        const posElement = document.createElement('div');
        posElement.className = 'hud-item position';
        posElement.textContent = `Pos: ${Math.round(aircraftData.position.x)}, ${Math.round(aircraftData.position.y)}, ${Math.round(aircraftData.position.z)}`;
        this.hudElement.appendChild(posElement);
    }
    
    /**
     * エラーメッセージを表示
     * @param message エラーメッセージ
     * @param duration 表示時間（ミリ秒）
     */
    public showError(message: string, duration: number = 5000): void {
        if (!this.hudElement) return;
        
        const errorElement = document.createElement('div');
        errorElement.className = 'hud-error';
        errorElement.textContent = message;
        this.hudElement.appendChild(errorElement);
        
        setTimeout(() => {
            if (errorElement.parentNode === this.hudElement) {
                this.hudElement?.removeChild(errorElement);
            }
        }, duration);
    }
    
    /**
     * 通知メッセージを表示
     * @param message 通知メッセージ
     * @param duration 表示時間（ミリ秒）
     */
    public showNotification(message: string, duration: number = 3000): void {
        if (!this.hudElement) return;
        
        const notificationElement = document.createElement('div');
        notificationElement.className = 'hud-notification';
        notificationElement.textContent = message;
        this.hudElement.appendChild(notificationElement);
        
        setTimeout(() => {
            if (notificationElement.parentNode === this.hudElement) {
                this.hudElement?.removeChild(notificationElement);
            }
        }, duration);
    }
}