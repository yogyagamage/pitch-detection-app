// TreeAnimation.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import p5 from 'p5';

interface Leaf {
  x: number;
  y: number;
  size: number;
  color: number[];
  colorName: string;
  isUsed: boolean;
}

interface Position {
  x: number;
  y: number;
}

//type LeafColor = 'green' | 'pink' | 'yellow' | 'blue';

interface AnimationController {
  fly: (color?: string | null, count?: number) => void;
  startRandomFlight: (color: string, count: number) => () => void;
}

interface TreeAnimationProps {
  onReady?: (controller: AnimationController) => void;
}

// Custom hook to control the animation
export const useTreeAnimation = () => {
  const [controller, setController] = useState<AnimationController | null>(null);

  const startRandomFlight = useCallback((color: string, count: number) => {
    
    if (controller) {
      controller.startRandomFlight(color, count);
    }
  }, [controller]);

  const fly = useCallback((color: string | null = null, count = 1) => {
    if (controller) {
      controller.fly(color, count);
    }
  }, [controller]);

  return {
    setController,
    startRandomFlight,
    fly
  };
};

class Bird {
  private x: number;
  private y: number;
  private color: number[];
  private speed: number;
  private angle: number;
  private size: number;
  private wingAngle: number;
  private wingSpeed: number;
  private p: p5;

  constructor(p: p5, x: number, y: number, color: number[]) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.color = color;
    this.speed = p.random(2, 4);
    this.angle = p.random(-p.PI/4, -3*p.PI/4);
    this.size = 15;
    this.wingAngle = 0;
    this.wingSpeed = 0.2;
  }

  update(): void {
    this.x += this.speed * Math.cos(this.angle);
    this.y += this.speed * Math.sin(this.angle);
    this.wingAngle += this.wingSpeed;
  }

  draw(): void {
    this.p.push();
    this.p.translate(this.x, this.y);
    this.p.rotate(-this.angle);
    this.p.fill(this.color[0], this.color[1], this.color[2]);
    this.p.noStroke();
    this.p.triangle(
      0, 0,
      -this.size * Math.cos(this.wingAngle), -this.size * Math.sin(this.wingAngle),
      -this.size/2, 0
    );
    this.p.triangle(
      0, 0,
      this.size * Math.cos(this.wingAngle), -this.size * Math.sin(this.wingAngle),
      this.size/2, 0
    );
    this.p.pop();
  }

  isOutOfBounds(): boolean {
    const buffer = 50;
    return this.y < -buffer || 
           this.y > this.p.height + buffer || 
           this.x < -buffer || 
           this.x > this.p.width + buffer;
  }
}

export const TreeAnimation: React.FC<TreeAnimationProps> = ({ onReady }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [sketch, setSketch] = useState<p5 | null>(null);
  const animationController = useRef<AnimationController>({} as AnimationController);

  useEffect(() => {
    let leaves: Leaf[] = [];
    let birds: Bird[] = [];
    let flightInterval: NodeJS.Timeout | null = null;

    const leafColors: Record<string, number[]> = {
      'yellow': [255, 248, 0],
      'orange': [255, 119, 51],
      'pink': [250, 112, 206],
      'red': [242, 92, 100],
      'green': [112, 250, 154],
      'darkgreen': [95, 217, 134],
      'blue': [94, 255, 252],
      'darkblue': [66, 135, 245],
      'purple': [115, 92, 242],
      'ash': [117, 117, 117],
      'brown': [242, 170, 92],
      'black': [10, 10, 10],
    };

    const s = (p: p5) => {
      p.setup = () => {
        const canvas = p.createCanvas(700, 700);
        if (canvasRef.current) {
          canvas.parent(canvasRef.current);
        }
        p.pixelDensity(3);
        p.background(250);
        p.noLoop();
        drawTree();
      };

      p.draw = () => {
        p.background(250);
        drawTreeStructure();
        
        leaves.forEach(leaf => {
          if (!leaf.isUsed) {
            drawLeaf(leaf);
          }
        });
        
        for (let i = birds.length - 1; i >= 0; i--) {
          birds[i].update();
          birds[i].draw();
          if (birds[i].isOutOfBounds()) {
            birds.splice(i, 1);
          }
        }
        
        if (birds.length === 0) {
          p.noLoop();
        }
      };

      function drawTree(): void {
        drawTreeStructure();
        generateLeaves();
      }

      function drawTreeStructure(): void {
        p.push();
        p.stroke(101, 67, 33);
        p.strokeWeight(20);
        
        const trunkHeight = 210;
        const startX = p.width/2;
        const startY = p.height - 50;
        p.line(startX, startY, startX, startY - trunkHeight);
        
        drawBranch(startX, startY - trunkHeight, trunkHeight * 0.6, -p.PI/2, 6);
        p.pop();
      }

      function drawBranch(x: number, y: number, len: number, angle: number, depth: number): void {
        if (depth === 0) return;
        
        const branchCount = depth > 4 ? 3 : 2;
        const angleStep = p.PI/3;
        const startAngle = angle - (angleStep * (branchCount-1))/2;
        
        for(let i = 0; i < branchCount; i++) {
          const newAngle = startAngle + angleStep * i;
          const endX = x + len * p.cos(newAngle);
          const endY = y + len * p.sin(newAngle);
          
          p.strokeWeight(depth*1.5);
          p.line(x, y, endX, endY);
          
          const newLen = len * 0.65;
          drawBranch(endX, endY, newLen, newAngle, depth - 1);
        }
      }

      function generateLeaves(): void {
        const leafPositions: Position[] = [];
        generateLeafPositions(p.width/2, p.height - 260, 126, -p.PI/2, 6, leafPositions);
        
        leafPositions.forEach(pos => {
          const colors: string[] = ['yellow', 'orange', 'pink', 'red', 'green', 'darkgreen', 'blue', 'darkblue', 'purple', 
            'ash', 'brown', 'black'];
          const colorName = colors[Math.floor(p.random(colors.length))];
          leaves.push({
            x: pos.x,
            y: pos.y,
            size: p.random(12, 24),
            color: leafColors[colorName],
            colorName: colorName,
            isUsed: false
          });
        });
      }

      function generateLeafPositions(
        x: number,
        y: number,
        len: number,
        angle: number,
        depth: number,
        positions: Position[]
      ): void {
        if (depth <= 1) {
          positions.push({x, y});
          return;
        }
        
        const branchCount = depth > 4 ? 3 : 2;
        const angleStep = p.PI/3;
        const startAngle = angle - (angleStep * (branchCount-1))/2;
        
        for(let i = 0; i < branchCount; i++) {
          const newAngle = startAngle + angleStep * i;
          const endX = x + len * p.cos(newAngle);
          const endY = y + len * p.sin(newAngle);
          
          positions.push({x: endX, y: endY});
          const newLen = len * 0.65;
          generateLeafPositions(endX, endY, newLen, newAngle, depth - 1, positions);
        }
      }

      function drawLeaf(leaf: Leaf): void {
        p.push();
        p.fill(leaf.color[0], leaf.color[1], leaf.color[2], 250);
        p.noStroke();
        p.translate(leaf.x, leaf.y);
        p.triangle(
          -leaf.size/2, leaf.size/2, 
          0, -leaf.size/2, 
          leaf.size/2, leaf.size/2
        );
        p.pop();
      }

      const fly = (color: string | null = null, count = 1): void => {
        const availableLeaves = leaves.filter(leaf => !leaf.isUsed && 
          (color === null || leaf.colorName === color));
        
        const numToFly = Math.min(count, availableLeaves.length);
        
        for (let i = 0; i < numToFly; i++) {
          const index = Math.floor(p.random(availableLeaves.length));
          const leaf = availableLeaves[index];
          leaf.isUsed = true;
          birds.push(new Bird(p, leaf.x, leaf.y, leaf.color));
          availableLeaves.splice(index, 1);
        }
        
        if (!p.isLooping()) {
          p.loop();
        }
      };

      // Store the animation controls in a ref to make them accessible from outside
      animationController.current = {
        fly,
        startRandomFlight: (color: string, count: number) => {
          //Clear any existing interval
          if (flightInterval) {
            clearInterval(flightInterval);
          }

          //fly(color, count);

          // Start new interval
          flightInterval = setInterval(() => {
            fly(color, count);
          }, 1000);
          
          return () => {
            if (flightInterval) {
              clearInterval(flightInterval);
            }
          };
        }
      };
      if (onReady) {
        onReady(animationController.current);
      }
    };

    const newSketch = new p5(s);
    setSketch(newSketch);

    return () => {
      if (flightInterval) {
        clearInterval(flightInterval);
      }
      newSketch.remove();
    };
  }, [onReady]);

  return (
    <div className="flex justify-center items-center w-full h-full bg-gray-100">
      <div ref={canvasRef} />
    </div>
  );
};

export default TreeAnimation;