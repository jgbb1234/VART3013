// Main WebGL application
document.addEventListener('DOMContentLoaded', function() {
    // Canvas and WebGL context
    const canvas = document.getElementById('shader-canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        alert('WebGL not supported in your browser');
        return;
    }
    
    // UI Elements
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const frequencySlider = document.getElementById('frequency');
    const speedSlider = document.getElementById('speed');
    const complexitySlider = document.getElementById('complexity');
    const shaderSelect = document.getElementById('shader-select');
    const palettes = document.querySelectorAll('.palette');
    const freqValue = document.getElementById('freq-value');
    const speedValue = document.getElementById('speed-value');
    const complexValue = document.getElementById('complex-value');
    const fpsCounter = document.getElementById('fps-counter');
    
    // Section headers for expand/collapse
    const sectionHeaders = document.querySelectorAll('h2[id$="header"]');
    
    // Expand/collapse functionality for sections
    sectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.id.replace('-header', '-content');
            const targetContent = document.getElementById(targetId);
            
            // Toggle this section
            const isExpanded = targetContent.classList.contains('expanded');
            
            if (isExpanded) {
                targetContent.classList.remove('expanded');
                this.classList.remove('expanded');
            } else {
                targetContent.classList.add('expanded');
                this.classList.add('expanded');
            }
        });
    });
    
    // Shader sources
    const shaderSources = {
        harmonic: document.getElementById('harmonic-fragment').textContent,
        fractal: document.getElementById('fractal-fragment').textContent,
        radial: document.getElementById('radial-fragment').textContent,
        voronoi: document.getElementById('voronoi-fragment').textContent
    };
    
    // Current shader
    let currentShader = 'harmonic';
    let shaderProgram = null;
    let uniforms = {};
    let startTime = Date.now();
    let frameCount = 0;
    let lastFpsUpdate = Date.now();
    let fps = 60;
    
    // Color palettes (RGB values)
    const colorPalettes = [
        {color1: [0.5, 0.2, 0.9], color2: [0.0, 0.8, 0.5]},
        {color1: [0.0, 0.7, 0.85], color2: [0.62, 0.31, 0.85]},
        {color1: [1.0, 0.62, 0.0], color2: [1.0, 0.18, 0.39]},
        {color1: [0.02, 0.84, 0.63], color2: [0.07, 0.53, 0.7]},
        {color1: [0.97, 0.15, 0.52], color2: [0.45, 0.04, 0.72]},
        {color1: [1.0, 0.82, 0.4], color2: [0.94, 0.28, 0.44]}
    ];
    
    let currentPalette = 0;
    
    // Initialize WebGL
    function initWebGL() {
        // Create vertex buffer
        const vertices = new Float32Array([
            -1, -1, 1, -1, -1, 1,
            -1, 1, 1, -1, 1, 1
        ]);
        
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // Compile shader
        compileShader('harmonic');
        
        // Set clear color
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        
        // Handle resize
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
    }
    
    // Compile and link shaders
    function compileShader(shaderType) {
        const vertexShaderSource = document.getElementById('vertex-shader').textContent;
        const fragmentShaderSource = shaderSources[shaderType];
        
        // Create and compile vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
            return;
        }
        
        // Create and compile fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
            return;
        }
        
        // Create shader program
        if (shaderProgram) {
            gl.deleteProgram(shaderProgram);
        }
        
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Shader program linking error:', gl.getProgramInfoLog(shaderProgram));
            return;
        }
        
        gl.useProgram(shaderProgram);
        
        // Get attribute and uniform locations
        const positionAttribute = gl.getAttribLocation(shaderProgram, 'a_position');
        gl.enableVertexAttribArray(positionAttribute);
        gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);
        
        // Store uniform locations
        uniforms = {
            u_time: gl.getUniformLocation(shaderProgram, 'u_time'),
            u_frequency: gl.getUniformLocation(shaderProgram, 'u_frequency'),
            u_speed: gl.getUniformLocation(shaderProgram, 'u_speed'),
            u_complexity: gl.getUniformLocation(shaderProgram, 'u_complexity'),
            u_color1: gl.getUniformLocation(shaderProgram, 'u_color1'),
            u_color2: gl.getUniformLocation(shaderProgram, 'u_color2'),
            u_resolution: gl.getUniformLocation(shaderProgram, 'u_resolution')
        };
        
        // Set initial uniform values
        updateUniforms();
    }
    
    // Update shader uniforms
    function updateUniforms() {
        const currentTime = (Date.now() - startTime) * 0.001;
        
        gl.uniform1f(uniforms.u_time, currentTime);
        gl.uniform1f(uniforms.u_frequency, parseFloat(frequencySlider.value));
        gl.uniform1f(uniforms.u_speed, parseFloat(speedSlider.value));
        gl.uniform1f(uniforms.u_complexity, parseFloat(complexitySlider.value));
        gl.uniform3f(uniforms.u_color1, 
            colorPalettes[currentPalette].color1[0],
            colorPalettes[currentPalette].color1[1],
            colorPalettes[currentPalette].color1[2]
        );
        gl.uniform3f(uniforms.u_color2,
            colorPalettes[currentPalette].color2[0],
            colorPalettes[currentPalette].color2[1],
            colorPalettes[currentPalette].color2[2]
        );
        gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    }
    
    // Render loop
    function render() {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        updateUniforms();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        // Update FPS counter
        frameCount++;
        const now = Date.now();
        if (now - lastFpsUpdate >= 1000) {
            fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
            fpsCounter.textContent = `FPS: ${fps}`;
            frameCount = 0;
            lastFpsUpdate = now;
        }
        
        requestAnimationFrame(render);
    }
    
    // Resize canvas
    function resizeCanvas() {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }
    }
    
    // UI Event Listeners
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('sidebar-collapsed');
        toggleBtn.innerHTML = sidebar.classList.contains('sidebar-collapsed') ? '▶' : '◀';
    });
    
    frequencySlider.addEventListener('input', function() {
        freqValue.textContent = parseFloat(this.value).toFixed(1);
    });
    
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = parseFloat(this.value).toFixed(1);
    });
    
    complexitySlider.addEventListener('input', function() {
        complexValue.textContent = parseFloat(this.value).toFixed(1);
    });
    
    shaderSelect.addEventListener('change', function() {
        currentShader = this.value;
        compileShader(currentShader);
    });
    
    palettes.forEach((palette, index) => {
        palette.addEventListener('click', function() {
            palettes.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            currentPalette = index;
        });
    });
    
    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / canvas.width;
        mouseY = 1.0 - (e.clientY - rect.top) / canvas.height;
        
        if (shaderProgram) {
            const mouseUniform = gl.getUniformLocation(shaderProgram, 'u_mouse');
            if (mouseUniform) {
                gl.uniform2f(mouseUniform, mouseX, mouseY);
            }
        }
    });
    
    // Initialize
    initWebGL();
    render();
});
