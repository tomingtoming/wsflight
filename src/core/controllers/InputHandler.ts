// filepath: /Users/toming/wsflight/src/core/controllers/InputHandler.ts
import { IInputHandler, Controls, Aircraft, CameraMode } from '../../physics/types';
import { ICameraController } from '../../physics/types';

/**
 * キーボードとマウス入力を処理するクラス
 */
export class InputHandler implements IInputHandler {
    private aircraft: Aircraft | null = null;
    private cameraController: ICameraController | null = null;
    private isDemo: boolean = true;
    private mouseControlsEnabled: boolean = false;
    private renderer: HTMLCanvasElement | null = null;
    
    // マウス入力関連
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDown: boolean = false;
    private mouseSensitivity: number = 0.5;
    private mouseCenter: { x: number, y: number } = { x: 0, y: 0 };
    
    /**
     * InputHandlerを初期化
     * @param renderer レンダリングキャンバス
     * @param aircraft 航空機オブジェクト
     * @param cameraController カメラコントローラー
     */
    constructor(
        renderer: HTMLCanvasElement | null = null,
        aircraft: Aircraft | null = null,
        cameraController: ICameraController | null = null
    ) {
        this.renderer = renderer;
        this.aircraft = aircraft;
        this.cameraController = cameraController;
        
        if (this.renderer) {
            this.addMouseListeners();
        }
        
        this.addKeyboardListeners();
    }
    
    /**
     * 航空機オブジェクトを設定
     * @param aircraft 航空機オブジェクト
     */
    public setAircraft(aircraft: Aircraft): void {
        this.aircraft = aircraft;
    }
    
    /**
     * カメラコントローラーを設定
     * @param cameraController カメラコントローラー
     */
    public setCameraController(cameraController: ICameraController): void {
        this.cameraController = cameraController;
    }
    
    /**
     * レンダラーを設定
     * @param renderer レンダリングキャンバス
     */
    public setRenderer(renderer: HTMLCanvasElement): void {
        this.renderer = renderer;
        this.removeMouseListeners();
        this.addMouseListeners();
    }
    
    /**
     * デモモードを設定する
     * @param isDemo デモモードかどうか
     */
    public setDemo(isDemo: boolean): void {
        this.isDemo = isDemo;
    }
    
    /**
     * マウスコントロール（仮想ジョイスティック）の有効/無効を設定
     * @param enabled 有効にするかどうか
     */
    public setMouseControlsEnabled(enabled: boolean): void {
        this.mouseControlsEnabled = enabled;
    }
    
    /**
     * マウスコントロールが有効かどうかを取得
     * @returns マウスコントロールが有効かどうか
     */
    public getMouseControlsEnabled(): boolean {
        return this.mouseControlsEnabled;
    }
    
    /**
     * キーボードイベントリスナーを追加
     */
    public addKeyboardListeners(): void {
        window.addEventListener('keydown', this.handleKeyDown.bind(this), false);
        window.addEventListener('keyup', this.handleKeyUp.bind(this), false);
    }
    
    /**
     * マウスイベントリスナーを追加
     */
    public addMouseListeners(): void {
        if (!this.renderer) return;
        
        this.renderer.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
        this.renderer.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
        this.renderer.addEventListener('mouseup', this.handleMouseUp.bind(this), false);
        this.renderer.addEventListener('contextmenu', this.handleContextMenu.bind(this), false);
    }
    
    /**
     * すべてのイベントリスナーを削除
     */
    public removeAllListeners(): void {
        window.removeEventListener('keydown', this.handleKeyDown.bind(this));
        window.removeEventListener('keyup', this.handleKeyUp.bind(this));
        
        this.removeMouseListeners();
    }
    
    /**
     * マウスイベントリスナーを削除
     */
    private removeMouseListeners(): void {
        if (!this.renderer) return;
        
        this.renderer.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.renderer.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.renderer.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.renderer.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
    }
    
    /**
     * 入力状態を更新
     */
    public update(): void {
        // マウスジョイスティックが有効で、マウスボタンが押されている場合に
        // 継続的に制御入力を更新する処理をここに追加できます
    }
    
    /**
     * キーダウンイベントの処理
     * @param event キーボードイベント
     */
    private handleKeyDown(event: KeyboardEvent): void {
        // デモモード中はスペースキーで実際のゲームを開始
        if (this.isDemo && event.code === 'Space') {
            this.startGame();
            return;
        }
        
        // デモモード中は他のキー入力を無視
        if (this.isDemo) return;
        
        // 航空機が未設定の場合は処理しない
        if (!this.aircraft) return;
        
        // YSFLIGHTと同じキーバインディング
        switch(event.code) {
            // 機体操作 - エレベータ/エルロン
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
                
            // ラダー制御
            case 'KeyZ': // ラダー左
                this.aircraft.setControls({ rudder: -1 });
                break;
            case 'KeyX': // ラダー中央
                this.aircraft.setControls({ rudder: 0 });
                break;
            case 'KeyC': // ラダー右
                this.aircraft.setControls({ rudder: 1 });
                break;
                
            // スロットル制御
            case 'KeyQ': // スロットル増加
                this.aircraft.setThrottle(Math.min(1.0, this.aircraft.getControls().throttle + 0.1));
                break;
            case 'KeyA': // スロットル減少
                this.aircraft.setThrottle(Math.max(0.0, this.aircraft.getControls().throttle - 0.1));
                break;
            case 'Tab': // アフターバーナー（将来的に実装）
                console.log("Afterburner toggled");
                break;
                
            // 着陸装置とブレーキ
            case 'KeyG': // 着陸装置（将来的に実装）
                console.log("Landing gear toggled");
                break;
            case 'KeyB': // スポイラーとブレーキ（将来的に実装）
                console.log("Spoiler and brake toggled");
                break;
                
            // 視点切替
            case 'F1': // コックピットビュー
                if (this.cameraController) {
                    this.cameraController.setCameraMode(CameraMode.COCKPIT);
                }
                break;
            case 'F2': // 外部視点
                if (this.cameraController) {
                    this.cameraController.setCameraMode(CameraMode.EXTERNAL);
                }
                break;
            case 'F3': // 追跡視点
                if (this.cameraController) {
                    this.cameraController.setCameraMode(CameraMode.CHASE);
                }
                break;
            case 'F4': // タワー視点
                if (this.cameraController) {
                    this.cameraController.setCameraMode(CameraMode.TOWER);
                }
                break;
                
            // マウス操作の切替
            case 'KeyM': // マウスジョイスティックモード切替
                this.mouseControlsEnabled = !this.mouseControlsEnabled;
                console.log("Mouse joystick mode: " + (this.mouseControlsEnabled ? "ON" : "OFF"));
                break;
                
            // 武器関連（将来的に実装）
            case 'Space': // 武器発射
                console.log("Fire weapon");
                break;
        }
    }
    
    /**
     * キーアップイベントの処理
     * @param event キーボードイベント
     */
    private handleKeyUp(event: KeyboardEvent): void {
        // デモモード中はキー入力を無視
        if (this.isDemo || !this.aircraft) return;
        
        switch(event.code) {
            case 'ArrowUp':
            case 'ArrowDown':
                this.aircraft.setControls({ elevator: 0 });
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
                this.aircraft.setControls({ aileron: 0 });
                break;
        }
    }
    
    /**
     * マウス移動イベントの処理
     * @param event マウスイベント
     */
    private handleMouseMove(event: MouseEvent): void {
        if (this.isDemo || !this.mouseControlsEnabled || !this.renderer || !this.aircraft) return;
        
        // マウス位置を取得
        const rect = this.renderer.getBoundingClientRect();
        this.mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // マウス位置を使って仮想ジョイスティック入力を計算
        if (this.mouseDown) {
            // マウスの中心からの相対位置を計算
            const dx = this.mouseX - this.mouseCenter.x;
            const dy = this.mouseY - this.mouseCenter.y;
            
            // エルロンとエレベータの値を設定（-1から1の範囲に制限）
            const aileron = Math.max(-1, Math.min(1, dx * this.mouseSensitivity));
            const elevator = Math.max(-1, Math.min(1, dy * this.mouseSensitivity));
            
            this.aircraft.setControls({
                aileron: aileron,
                elevator: elevator
            });
        }
    }
    
    /**
     * マウスボタン押下イベントの処理
     * @param event マウスイベント
     */
    private handleMouseDown(event: MouseEvent): void {
        if (this.isDemo) {
            // デモモード中はクリックでゲーム開始
            this.startGame();
            return;
        }
        
        if (!this.mouseControlsEnabled || !this.renderer || !this.aircraft) return;
        
        this.mouseDown = true;
        
        // マウスの中心位置を記録
        const rect = this.renderer.getBoundingClientRect();
        this.mouseCenter.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseCenter.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // 左クリックで武器発射、右クリックで武器選択など
        if (event.button === 0) {
            // 左クリック - 将来的に武器発射などに使用
            console.log("Left mouse button pressed");
        } else if (event.button === 2) {
            // 右クリック - 将来的に武器選択などに使用
            console.log("Right mouse button pressed");
        }
    }
    
    /**
     * マウスボタン解放イベントの処理
     * @param event マウスイベント
     */
    private handleMouseUp(event: MouseEvent): void {
        if (this.isDemo || !this.mouseControlsEnabled || !this.aircraft) return;
        
        this.mouseDown = false;
        
        // マウスを離したら制御を中立に戻す
        this.aircraft.setControls({
            aileron: 0,
            elevator: 0
        });
    }
    
    /**
     * 右クリックメニューを無効化
     * @param event マウスイベント
     */
    private handleContextMenu(event: MouseEvent): void {
        event.preventDefault();
    }
    
    /**
     * デモモードからゲームを開始
     */
    private startGame(): void {
        // イベント発行のみ行い、実際の処理は外部で実装
        const event = new CustomEvent('gamestart');
        window.dispatchEvent(event);
    }
}