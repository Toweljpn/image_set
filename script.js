document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const setupScreen = document.getElementById('setup-screen');
    const compositionScreen = document.getElementById('composition-screen');
    const productSelection = document.getElementById('product-selection');
    const bgImageInput = document.getElementById('bg-image-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const goToCompositionBtn = document.getElementById('go-to-composition');
    const canvas = document.getElementById('main-canvas');
    const ctx = canvas.getContext('2d');
    const rotationSlider = document.getElementById('rotation-slider');
    const rotationValue = document.getElementById('rotation-value');
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    const saveImageBtn = document.getElementById('save-image');
    const backToSetupBtn = document.getElementById('back-to-setup');

    // --- アプリケーションの状態管理 ---
    let selectedProduct = null;
    let backgroundImage = null;
    let productImg = new Image();
    let bgImg = new Image();

    // 配置するアイテムの状態
    const transform = {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
        width: 0,
        height: 0
    };

    // ドラッグ状態の管理
    let isDragging = false;
    let dragStartX, dragStartY;

    // --- 初期化処理 ---
    function initialize() {
        generateDummyProducts();
        setupEventListeners();
        resetTransform();
    }

    // --- ダミー製品画像の生成 ---
    function generateDummyProducts() {
        const products = [
            { id: 'sofa', color: '#c0392b', type: 'rect', name: 'ソファ' },
            { id: 'plant', color: '#27ae60', type: 'circle', name: '観葉植物' },
            { id: 'table', color: '#8e44ad', type: 'rect', name: 'テーブル' },
            { id: 'lamp', color: '#f39c12', type: 'triangle', name: '照明' }
        ];

        products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.dataset.id = p.id;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 100;
            tempCanvas.height = 100;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.fillStyle = p.color;

            if (p.type === 'rect') {
                tempCtx.fillRect(10, 25, 80, 50);
            } else if (p.type === 'circle') {
                tempCtx.beginPath();
                tempCtx.arc(50, 50, 40, 0, Math.PI * 2);
                tempCtx.fill();
            } else if (p.type === 'triangle') {
                tempCtx.beginPath();
                tempCtx.moveTo(50, 10);
                tempCtx.lineTo(10, 90);
                tempCtx.lineTo(90, 90);
                tempCtx.closePath();
                tempCtx.fill();
            }

            const img = document.createElement('img');
            img.src = tempCanvas.toDataURL();
            img.alt = p.name;
            item.appendChild(img);
            productSelection.appendChild(item);
        });
    }

    // --- イベントリスナーの設定 ---
    function setupEventListeners() {
        // アイテム選択
        productSelection.addEventListener('click', handleProductSelect);
        // 背景画像選択
        bgImageInput.addEventListener('change', handleBgImageSelect);
        // 配置画面へ
        goToCompositionBtn.addEventListener('click', showCompositionScreen);
        // 設定画面へ戻る
        backToSetupBtn.addEventListener('click', showSetupScreen);
        // 保存ボタン
        saveImageBtn.addEventListener('click', saveImage);

        // Canvasでの操作
        canvas.addEventListener('mousedown', handleDragStart);
        canvas.addEventListener('mousemove', handleDragMove);
        canvas.addEventListener('mouseup', handleDragEnd);
        canvas.addEventListener('mouseleave', handleDragEnd);
        canvas.addEventListener('touchstart', handleDragStart, { passive: false });
        canvas.addEventListener('touchmove', handleDragMove, { passive: false });
        canvas.addEventListener('touchend', handleDragEnd);
        canvas.addEventListener('wheel', handleWheel, { passive: false });

        // 操作パネル
        rotationSlider.addEventListener('input', handleRotationChange);
        scaleSlider.addEventListener('input', handleScaleChange);
    }

    // --- 状態の更新とチェック ---
    function checkSelections() {
        goToCompositionBtn.disabled = !(selectedProduct && backgroundImage);
    }

    function resetTransform() {
        transform.x = canvas.width / 2;
        transform.y = canvas.height / 2;
        transform.scale = 1;
        transform.rotation = 0;
        rotationSlider.value = 0;
        scaleSlider.value = 1;
        updateControlDisplays();
    }

    // --- 画面遷移 ---
    function showCompositionScreen() {
        if (!selectedProduct || !backgroundImage) return;

        productImg.src = selectedProduct.querySelector('img').src;
        bgImg.src = URL.createObjectURL(backgroundImage);

        bgImg.onload = () => {
            productImg.onload = () => {
                setupCanvas();
                resetTransform();
                drawCanvas();
                setupScreen.classList.remove('active');
                compositionScreen.classList.add('active');
            }
        }
    }

    function showSetupScreen() {
        compositionScreen.classList.remove('active');
        setupScreen.classList.add('active');
        // 選択状態をリセット
        if(selectedProduct) {
            selectedProduct.classList.remove('selected');
        }
        selectedProduct = null;
        backgroundImage = null;
        bgImageInput.value = '';
        fileNameDisplay.textContent = '選択されていません';
        checkSelections();
    }

    // --- 設定画面のハンドラ ---
    function handleProductSelect(e) {
        const item = e.target.closest('.product-item');
        if (!item) return;

        if (selectedProduct) {
            selectedProduct.classList.remove('selected');
        }
        selectedProduct = item;
        selectedProduct.classList.add('selected');
        checkSelections();
    }

    function handleBgImageSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            backgroundImage = file;
            fileNameDisplay.textContent = file.name;
        } else {
            backgroundImage = null;
            fileNameDisplay.textContent = '選択されていません';
        }
        checkSelections();
    }

    // --- 配置画面: Canvas関連 ---
    function setupCanvas() {
        const container = canvas.parentElement;
        const containerRatio = container.clientWidth / container.clientHeight;
        const bgRatio = bgImg.width / bgImg.height;

        if (containerRatio > bgRatio) {
            canvas.height = container.clientHeight;
            canvas.width = canvas.height * bgRatio;
        } else {
            canvas.width = container.clientWidth;
            canvas.height = canvas.width / bgRatio;
        }
        
        // アイテムの初期サイズを調整
        const initialScale = Math.min(canvas.width / productImg.width, canvas.height / productImg.height) / 5;
        transform.width = productImg.width * initialScale;
        transform.height = productImg.height * initialScale;
        transform.scale = 1; // スライダー用にリセット
        scaleSlider.value = 1;
    }

    function drawCanvas() {
        if (!bgImg.src || !productImg.src) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // 背景を描画
        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

        // アイテムを描画
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(transform.scale, transform.scale);
        
        const w = transform.width;
        const h = transform.height;
        ctx.drawImage(productImg, -w / 2, -h / 2, w, h);
        ctx.restore();
    }

    // --- 配置画面: 操作ハンドラ ---
    function handleDragStart(e) {
        e.preventDefault();
        const pos = getEventPosition(e);
        if (isHittingItem(pos.x, pos.y)) {
            isDragging = true;
            canvas.classList.add('grabbing');
            dragStartX = pos.x - transform.x;
            dragStartY = pos.y - transform.y;
        }
    }

    function handleDragMove(e) {
        if (!isDragging) return;
        e.preventDefault();
        const pos = getEventPosition(e);
        transform.x = pos.x - dragStartX;
        transform.y = pos.y - dragStartY;
        drawCanvas();
    }

    function handleDragEnd() {
        isDragging = false;
        canvas.classList.remove('grabbing');
    }

    function handleWheel(e) {
        e.preventDefault();
        const pos = getEventPosition(e);
        if (isHittingItem(pos.x, pos.y)) {
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const newScale = Math.max(0.1, Math.min(3, parseFloat(scaleSlider.value) + delta));
            scaleSlider.value = newScale;
            handleScaleChange();
        }
    }
    
    function handleRotationChange() {
        transform.rotation = rotationSlider.value;
        updateControlDisplays();
        drawCanvas();
    }

    function handleScaleChange() {
        transform.scale = scaleSlider.value;
        updateControlDisplays();
        drawCanvas();
    }

    // --- ユーティリティ関数 ---
    function getEventPosition(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return { 
                x: e.touches[0].clientX - rect.left, 
                y: e.touches[0].clientY - rect.top 
            };
        }
        return { 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top 
        };
    }

    function isHittingItem(x, y) {
        // 回転を考慮したヒット判定
        const dx = x - transform.x;
        const dy = y - transform.y;
        const angle = -transform.rotation * Math.PI / 180;
        const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

        const w = transform.width * transform.scale / 2;
        const h = transform.height * transform.scale / 2;

        return rotatedX > -w && rotatedX < w && rotatedY > -h && rotatedY < h;
    }
    
    function updateControlDisplays() {
        rotationValue.textContent = `${Math.round(rotationSlider.value)}°`;
        scaleValue.textContent = parseFloat(scaleSlider.value).toFixed(2);
    }

    // --- 保存処理 ---
    function saveImage() {
        // 保存時に操作ハンドルなどを非表示にするため、一度描画する
        drawCanvas(); 

        const link = document.createElement('a');
        link.download = 'composition.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    
    // --- ウィンドウリサイズ対応 ---
    window.addEventListener('resize', () => {
        if (compositionScreen.classList.contains('active')) {
            setupCanvas();
            drawCanvas();
        }
    });

    // --- アプリケーション開始 ---
    initialize();
});
