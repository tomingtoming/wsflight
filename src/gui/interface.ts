/**
 * GUI Interface Module
 *
 * This module is responsible for creating and managing the user interface elements
 * of the flight simulator, including control panels, HUD, and menus.
 */

// Interface for UI element position and size
interface UIElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Interface for UI element style
interface UIElementStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  border?: string;
  borderRadius?: string;
  padding?: string;
  opacity?: number;
  pointerEvents?: string;
  textAlign?: string;
  cursor?: string;
}

// Base UI element class
abstract class UIElement {
  protected element: HTMLElement;
  protected rect: UIElementRect;
  protected visible: boolean = true;

  constructor(id: string, rect: UIElementRect, style: UIElementStyle = {}) {
    // Create element if it doesn't exist
    const existingElement = document.getElementById(id);
    if (existingElement) {
      this.element = existingElement;
    } else {
      this.element = document.createElement("div");
      this.element.id = id;
      document.body.appendChild(this.element);
    }

    // Set position and size
    this.rect = rect;
    this.updatePosition();

    // Apply base styles
    Object.assign(this.element.style, {
      position: "absolute",
      boxSizing: "border-box",
      userSelect: "none",
      ...style,
    });
  }

  /**
   * Update the element's position and size
   */
  protected updatePosition(): void {
    Object.assign(this.element.style, {
      left: `${this.rect.x}px`,
      top: `${this.rect.y}px`,
      width: `${this.rect.width}px`,
      height: `${this.rect.height}px`,
    });
  }

  /**
   * Show the element
   */
  public show(): void {
    this.visible = true;
    this.element.style.display = "block";
  }

  /**
   * Hide the element
   */
  public hide(): void {
    this.visible = false;
    this.element.style.display = "none";
  }

  /**
   * Toggle visibility
   */
  public toggleVisibility(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Set the element's position and size
   */
  public setRect(rect: Partial<UIElementRect>): void {
    this.rect = { ...this.rect, ...rect };
    this.updatePosition();
  }

  /**
   * Get the HTML element
   */
  public getElement(): HTMLElement {
    return this.element;
  }
}

// Panel UI element
class Panel extends UIElement {
  constructor(id: string, rect: UIElementRect, style: UIElementStyle = {}) {
    super(id, rect, {
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      color: "white",
      borderRadius: "5px",
      padding: "10px",
      ...style,
    });
  }

  /**
   * Set the panel's content
   */
  public setContent(content: string): void {
    this.element.innerHTML = content;
  }

  /**
   * Append content to the panel
   */
  public appendContent(content: string): void {
    this.element.innerHTML += content;
  }
}

// Button UI element
class Button extends UIElement {
  private callback: () => void;

  constructor(
    id: string,
    rect: UIElementRect,
    label: string,
    callback: () => void,
    style: UIElementStyle = {},
  ) {
    super(id, rect, {
      backgroundColor: "rgba(50, 50, 50, 0.8)",
      color: "white",
      border: "1px solid #555",
      borderRadius: "3px",
      padding: "5px",
      textAlign: "center",
      cursor: "pointer",
      ...style,
    });

    this.element.innerHTML = label;
    this.callback = callback;

    // Add click event listener
    this.element.addEventListener("click", () => this.callback());

    // Add hover effects
    this.element.addEventListener("mouseenter", () => {
      this.element.style.backgroundColor = "rgba(70, 70, 70, 0.8)";
    });

    this.element.addEventListener("mouseleave", () => {
      this.element.style.backgroundColor = "rgba(50, 50, 50, 0.8)";
    });
  }

  /**
   * Set the button's label
   */
  public setLabel(label: string): void {
    this.element.innerHTML = label;
  }

  /**
   * Set the button's callback
   */
  public setCallback(callback: () => void): void {
    this.callback = callback;
  }
}

// HUD (Heads-Up Display) element
class HUD extends UIElement {
  private elements: Map<string, HTMLElement> = new Map();

  constructor(id: string = "hud") {
    super(id, {
      x: 0,
      y: 0,
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
    }, {
      pointerEvents: "none",
    });

    // Update HUD size on window resize
    globalThis.addEventListener("resize", () => {
      this.setRect({
        width: globalThis.innerWidth,
        height: globalThis.innerHeight,
      });
    });
  }

  /**
   * Add an element to the HUD
   */
  public addElement(
    id: string,
    content: string,
    position: { x: number; y: number },
  ): HTMLElement {
    // Create element if it doesn't exist
    let element = this.elements.get(id);
    if (!element) {
      element = document.createElement("div");
      element.id = id;
      this.element.appendChild(element);
      this.elements.set(id, element);
    }

    // Set content and position
    element.innerHTML = content;
    Object.assign(element.style, {
      position: "absolute",
      left: `${position.x}px`,
      top: `${position.y}px`,
      color: "white",
      textShadow: "1px 1px 2px black",
      fontFamily: "monospace",
      fontSize: "14px",
    });

    return element;
  }

  /**
   * Update an element's content
   */
  public updateElement(id: string, content: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.innerHTML = content;
    }
  }

  /**
   * Remove an element from the HUD
   */
  public removeElement(id: string): boolean {
    const element = this.elements.get(id);
    if (element) {
      this.element.removeChild(element);
      return this.elements.delete(id);
    }
    return false;
  }
}

// Menu system
class Menu extends UIElement {
  private items: Button[] = [];

  constructor(id: string, rect: UIElementRect, style: UIElementStyle = {}) {
    super(id, rect, {
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "white",
      borderRadius: "5px",
      padding: "10px",
      ...style,
    });
  }

  /**
   * Add a menu item
   */
  public addItem(label: string, callback: () => void): Button {
    const itemHeight = 30;
    const itemMargin = 5;
    const y = this.items.length * (itemHeight + itemMargin);

    const button = new Button(
      `${this.element.id}-item-${this.items.length}`,
      {
        x: 10,
        y,
        width: this.rect.width - 20,
        height: itemHeight,
      },
      label,
      callback,
    );

    this.element.appendChild(button.getElement());
    this.items.push(button);

    return button;
  }

  /**
   * Clear all menu items
   */
  public clearItems(): void {
    this.items.forEach((item) => {
      this.element.removeChild(item.getElement());
    });
    this.items = [];
  }
}

// Main GUI manager class
class GUIManager {
  private panels: Map<string, Panel> = new Map();
  private buttons: Map<string, Button> = new Map();
  private hud: HUD;
  private menus: Map<string, Menu> = new Map();
  private activeMenu: string | null = null;

  constructor() {
    // Create HUD
    this.hud = new HUD();

    // Add basic HUD elements
    this.hud.addElement("speed", "SPEED: 0 kts", { x: 20, y: 20 });
    this.hud.addElement("altitude", "ALT: 0 ft", { x: 20, y: 40 });
    this.hud.addElement("heading", "HDG: 0°", { x: 20, y: 60 });

    // Create main menu
    this.createMainMenu();
  }

  /**
   * Create the main menu
   */
  private createMainMenu(): void {
    const menu = new Menu("main-menu", {
      x: globalThis.innerWidth / 2 - 100,
      y: globalThis.innerHeight / 2 - 150,
      width: 200,
      height: 300,
    });

    menu.addItem("Start Flight", () => {
      console.log("Start flight");
      this.hideMenu("main-menu");
    });

    menu.addItem("Options", () => {
      console.log("Options");
      this.showMenu("options-menu");
      this.hideMenu("main-menu");
    });

    menu.addItem("Exit", () => {
      console.log("Exit");
    });

    this.menus.set("main-menu", menu);
    menu.hide(); // Hide initially

    // Create options menu
    this.createOptionsMenu();
  }

  /**
   * Create the options menu
   */
  private createOptionsMenu(): void {
    const menu = new Menu("options-menu", {
      x: globalThis.innerWidth / 2 - 150,
      y: globalThis.innerHeight / 2 - 200,
      width: 300,
      height: 400,
    });

    menu.addItem("Graphics Settings", () => {
      console.log("Graphics settings");
    });

    menu.addItem("Control Settings", () => {
      console.log("Control settings");
    });

    menu.addItem("Sound Settings", () => {
      console.log("Sound settings");
    });

    menu.addItem("Back", () => {
      this.hideMenu("options-menu");
      this.showMenu("main-menu");
    });

    this.menus.set("options-menu", menu);
    menu.hide(); // Hide initially
  }

  /**
   * Show a menu
   */
  public showMenu(id: string): void {
    const menu = this.menus.get(id);
    if (menu) {
      menu.show();
      this.activeMenu = id;
    }
  }

  /**
   * Hide a menu
   */
  public hideMenu(id: string): void {
    const menu = this.menus.get(id);
    if (menu) {
      menu.hide();
      if (this.activeMenu === id) {
        this.activeMenu = null;
      }
    }
  }

  /**
   * Create a panel
   */
  public createPanel(
    id: string,
    rect: UIElementRect,
    style: UIElementStyle = {},
  ): Panel {
    const panel = new Panel(id, rect, style);
    this.panels.set(id, panel);
    return panel;
  }

  /**
   * Create a button
   */
  public createButton(
    id: string,
    rect: UIElementRect,
    label: string,
    callback: () => void,
    style: UIElementStyle = {},
  ): Button {
    const button = new Button(id, rect, label, callback, style);
    this.buttons.set(id, button);
    return button;
  }

  /**
   * Update HUD information
   */
  public updateHUD(speed: number, altitude: number, heading: number): void {
    this.hud.updateElement("speed", `SPEED: ${Math.round(speed)} kts`);
    this.hud.updateElement("altitude", `ALT: ${Math.round(altitude)} ft`);
    this.hud.updateElement("heading", `HDG: ${Math.round(heading)}°`);
  }

  /**
   * Show the main menu
   */
  public showMainMenu(): void {
    this.showMenu("main-menu");
  }

  /**
   * Get the HUD
   */
  public getHUD(): HUD {
    return this.hud;
  }
}

// Singleton instance
let guiManagerInstance: GUIManager | null = null;

/**
 * Initialize the GUI
 */
export function initializeGUI(): GUIManager {
  if (!guiManagerInstance) {
    guiManagerInstance = new GUIManager();
    console.log("GUI initialized");
  }
  return guiManagerInstance;
}

/**
 * Get the GUI manager instance
 */
export function getGUIManager(): GUIManager | null {
  return guiManagerInstance;
}
