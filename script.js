class HotSpotManager {
    constructor(canvasId, fileInputId, shapeSelectId, undoBtnId, redoBtnId, opacityId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.image = new Image();
        this.fileInput = document.getElementById(fileInputId);
        this.opacityRange = document.getElementById(opacityId);
        this.shapeSelect = document.getElementById(shapeSelectId);
        this.undoBtn = document.getElementById(undoBtnId);
        this.redoBtn = document.getElementById(redoBtnId);

        this.drawingEnabled = false;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.selectedShape = 'rectangle';
        this.shapes = [];

        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.imageScale = 1;

        this.history = [[]];
        this.currentState = 0;
        this.opacity = 1;

        this.init();
    }

    init() {
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        this.canvas.addEventListener('pointerdown', this.startDrawing.bind(this));
        this.canvas.addEventListener('pointermove', this.draw.bind(this));
        this.canvas.addEventListener('pointerup', this.stopDrawing.bind(this));
        document.getElementById('addHotspot').addEventListener('click', this.enableDrawing.bind(this));
        this.shapeSelect.addEventListener('change', (e) => {
            this.selectedShape = e.target.value;
        });
        this.undoBtn.addEventListener('click', this.undo.bind(this));
        this.redoBtn.addEventListener('click', this.redo.bind(this));
        this.opacityRange.addEventListener('input', () => {
            this.opacity = this.opacityRange.value / 100;
            this.drawImage();
        });

    }

    enableDrawing() {
        this.drawingEnabled = true;
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = this.handleFileLoad.bind(this);
            reader.readAsDataURL(file);
        }
    }

    handleFileLoad(event) {
        this.image.onload = this.drawImage.bind(this);
        this.image.src = event.target.result;
    }

    drawImage() {
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        const imageAspect = this.image.width / this.image.height;
        const canvasAspect = canvasWidth / canvasHeight;

        let drawWidth, drawHeight;
        let offsetX = 0, offsetY = 0;

        if (imageAspect > canvasAspect) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imageAspect;
            offsetY = (canvasHeight - drawHeight) / 2;
        } else {
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imageAspect;
            offsetX = (canvasWidth - drawWidth) / 2;
        }

        this.imageOffsetX = offsetX;
        this.imageOffsetY = offsetY;
        this.imageScale = drawWidth / this.image.width;

        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        this.ctx.drawImage(this.image, offsetX, offsetY, drawWidth, drawHeight);

        this.shapes.forEach(shape => this.drawShape(shape));
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    startDrawing(e) {
        if (!this.drawingEnabled) return;
        const pos = this.getMousePos(e);
        this.isDrawing = true;
        this.startX = (pos.x - this.imageOffsetX) / this.imageScale;
        this.startY = (pos.y - this.imageOffsetY) / this.imageScale;
    }

    draw(e) {
        if (!this.drawingEnabled || !this.isDrawing) return;

        const pos = this.getMousePos(e);
        const endX = (pos.x - this.imageOffsetX) / this.imageScale;
        const endY = (pos.y - this.imageOffsetY) / this.imageScale;

        this.drawImage();

        const shape = {
            type: this.selectedShape,
            startX: this.startX,
            startY: this.startY,
            endX: endX,
            endY: endY,
            index: this.shapes.length + 1
        };
        this.drawShape(shape);
    }

    stopDrawing(e) {
        if (!this.drawingEnabled || !this.isDrawing) return;

        const pos = this.getMousePos(e);
        const endX = (pos.x - this.imageOffsetX) / this.imageScale;
        const endY = (pos.y - this.imageOffsetY) / this.imageScale;

        const newShape = {
            type: this.selectedShape,
            startX: this.startX,
            startY: this.startY,
            endX: endX,
            endY: endY,
            index: this.shapes.length + 1
        };

        this.addToHistory([...this.shapes, newShape]);
        this.shapes.push(newShape);

        this.isDrawing = false;
        this.drawingEnabled = false;
        this.drawImage();
        this.saveShapes();
    }

    drawShape(shape) {
        this.ctx.save();
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;

        const startX = shape.startX * this.imageScale + this.imageOffsetX;
        const startY = shape.startY * this.imageScale + this.imageOffsetY;
        const width = (shape.endX - shape.startX) * this.imageScale;
        const height = (shape.endY - shape.startY) * this.imageScale;

        // Function to draw horizontal lines pattern
        const drawPattern = (x, y, w, h) => {
            this.ctx.globalAlpha = this.opacity;
            this.ctx.fillStyle = "yellow";
            this.ctx.fillRect(x, y, w, h);
            this.ctx.globalAlpha = 1.0;

            const lineSpacing = 10; // Distance between lines
            const lineWidth = 2;    // Width of lines

            this.ctx.strokeStyle = 'red';
            this.ctx.lineWidth = lineWidth;
            for (let i = y; i <= y + h; i += lineSpacing) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, i);
                this.ctx.lineTo(x + w, i);
                this.ctx.stroke();
            }
        };

        switch (shape.type) {
            case 'rectangle':
                this.ctx.strokeRect(startX, startY, width, height);
                drawPattern(startX, startY, width, height);
                break;

            case 'square':
                const side = Math.min(Math.abs(width), Math.abs(height));
                this.ctx.strokeRect(startX, startY, side * Math.sign(width), side * Math.sign(height));
                drawPattern(startX, startY, side * Math.sign(width), side * Math.sign(height));
                break;

            case 'circle':
                const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;

                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.stroke();

                // Create a clipping region for the circle
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                this.ctx.clip();

                // Draw horizontal lines within the circle
                const drawPatternInCircle = () => {
                    this.ctx.globalAlpha = this.opacity;
                    this.ctx.fillStyle = "yellow";
                    this.ctx.fill(); // Fill within the clipped region
                    this.ctx.globalAlpha = 1.0;

                    const lineSpacing = 10; // Distance between lines
                    this.ctx.strokeStyle = 'red';
                    this.ctx.lineWidth = 2;

                    for (let y = centerY - radius; y <= centerY + radius; y += lineSpacing) {
                        // Calculate x positions where the line intersects the circle
                        const dx = Math.sqrt(radius * radius - Math.pow(y - centerY, 2));
                        const x1 = centerX - dx;
                        const x2 = centerX + dx;

                        this.ctx.beginPath();
                        this.ctx.moveTo(x1, y);
                        this.ctx.lineTo(x2, y);
                        this.ctx.stroke();
                    }
                };

                drawPatternInCircle();
                this.ctx.restore();
                break;


            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY + height); // Bottom-left
                this.ctx.lineTo(startX + width / 2, startY); // Top-center
                this.ctx.lineTo(startX + width, startY + height); // Bottom-right
                this.ctx.closePath();
                this.ctx.stroke();

                // Create a clipping region for the triangle
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY + height); // Bottom-left
                this.ctx.lineTo(startX + width / 2, startY); // Top-center
                this.ctx.lineTo(startX + width, startY + height); // Bottom-right
                this.ctx.closePath();
                this.ctx.clip();
                drawPattern(startX, startY, width, height);
                this.ctx.restore();
                break;
        }

        this.ctx.restore();

        // Draw handler
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(startX, startY, 7, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw shape number
        this.ctx.fillStyle = 'black';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(shape.index.toString(), startX, startY);

        this.ctx.restore();
    }

    addToHistory(shapes) {
        const shapesWithIndices = shapes.map((shape, index) => ({
            ...shape,
            index: index + 1
        }));

        if (this.currentState === -1 && this.history.length === 0) {
            this.history.push([]);
            this.currentState++;
        }

        this.history = this.history.slice(0, this.currentState + 1);
        this.history.push(shapesWithIndices);
        this.currentState++;
        this.updateButtonStates();
        this.saveShapes();
    }

    undo() {
        if (this.currentState >= 0) {
            this.currentState--;
            this.shapes = this.currentState >= 0 ? [...this.history[this.currentState]] : [];
            this.drawImage();
            this.updateButtonStates();
            this.saveShapes();
        }
    }

    redo() {
        if (this.currentState < this.history.length - 1) {
            this.currentState++;
            this.shapes = [...this.history[this.currentState]];
            this.drawImage();
            this.updateButtonStates();
            this.saveShapes();
        }
    }

    updateButtonStates() {
        this.undoBtn.disabled = this.currentState < 0;
        this.redoBtn.disabled = this.currentState >= this.history.length - 1;
    }

    saveShapes() {
        const shapesWithIndices = this.shapes.map((shape, index) => ({
            ...shape,
            index: index + 1
        }));
        const shapesData = JSON.stringify(shapesWithIndices);
        localStorage.setItem('savedShapes', shapesData);
        console.log('Shapes saved:', shapesWithIndices);
        for(var i=0;i<shapesWithIndices.length;i++){
            console.log(shapesWithIndices[i]);
        }
    }


}

// Create an instance of CanvasImageManager
new HotSpotManager('Mycanvas', 'imageUploader', 'shape', 'undoBtn', 'redoBtn', 'opacityRange');
