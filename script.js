// ==========================================
// 1. 初期データの設定
// ==========================================

const defaultData = {
    staffList: [], 
    itemList: [], 
    orders: {},
    orderRemark: ''
};

// 状態管理変数
let state = JSON.parse(JSON.stringify(defaultData));

// ==========================================
// 2. 起動時の処理
// ==========================================
window.onload = function() {
    loadStateFromURL();
    renderAll();
};

// ==========================================
// 3. データ保存・読み込み (URL Hash)
// ==========================================

function loadStateFromURL() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        try {
            const jsonString = decodeURIComponent(escape(window.atob(hash)));
            const loadedState = JSON.parse(jsonString);

            state = { ...defaultData, ...loadedState };

            // 互換性処理: assignments -> requester
            if (loadedState.assignments) {
                state.itemList.forEach(item => {
                    if (!item.requester && loadedState.assignments[item.name]) {
                        item.requester = loadedState.assignments[item.name];
                    }
                });
            }
        } catch (e) {
            console.error("読み込みエラー", e);
        }
    }
    
    state.itemList.forEach(item => {
        if (state.orders[item.name] === undefined) state.orders[item.name] = 0;
    });
}

function saveStateToURL() {
    const jsonString = JSON.stringify(state);
    const hash = window.btoa(unescape(encodeURIComponent(jsonString)));
    window.history.replaceState(null, null, '#' + hash);
}

function resetData() {
    if (confirm("全てのデータを削除して初期状態に戻しますか？")) {
        state = JSON.parse(JSON.stringify(defaultData));
        window.history.pushState(null, null, window.location.pathname);
        renderAll();
        alert("リセットしました。管理画面から設定を行ってください。");
    }
}

// ==========================================
// 4. 画面描画処理
// ==========================================

function renderAll() {
    renderAdminStaffSelect();
    renderOrderInputs();
    renderConfirmScreen();
    updateWarningMessage();
    
    document.getElementById('order-remark').value = state.orderRemark || '';
}

function renderAdminStaffSelect() {
    const select = document.getElementById('admin-staff-select');
    select.innerHTML = '';

    const defaultOpt = document.createElement('option');
    defaultOpt.value = "";
    defaultOpt.textContent = "-- 依頼者を選択してください --";
    select.appendChild(defaultOpt);

    state.staffList.forEach(staff => {
        const opt = document.createElement('option');
        opt.value = staff;
        opt.textContent = staff;
        select.appendChild(opt);
    });
}

function updateWarningMessage() {
    const warningBox = document.getElementById('setup-warning');
    const msgList = [];

    if (state.staffList.length === 0) {
        msgList.push("・注文依頼者が登録されていません。管理画面から追加してください。");
    }
    if (state.itemList.length === 0) {
        msgList.push("・備品が登録されていません。管理画面から追加してください。");
    }

    if (msgList.length > 0) {
        warningBox.innerHTML = "<strong>【設定が必要です】</strong><br>" + msgList.join("<br>");
        warningBox.style.display = 'block';
    } else {
        warningBox.style.display = 'none';
    }
}

function renderOrderInputs() {
    const container = document.getElementById('items-container');
    container.innerHTML = '';

    state.itemList.forEach(item => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'item-info';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'item-name';
        nameSpan.textContent = item.name;
        infoDiv.appendChild(nameSpan);

        if (item.desc) {
            const descSpan = document.createElement('div');
            descSpan.className = 'item-desc';
            descSpan.textContent = item.desc;
            infoDiv.appendChild(descSpan);
        }

        if (item.requester) {
            const reqDisplay = document.createElement('div');
            reqDisplay.className = 'item-requester-display';
            reqDisplay.textContent = `依頼者: ${item.requester}`;
            infoDiv.appendChild(reqDisplay);
        } else {
            const noReqDisplay = document.createElement('div');
            noReqDisplay.className = 'item-requester-display';
            noReqDisplay.style.backgroundColor = '#eee';
            noReqDisplay.style.color = '#999';
            noReqDisplay.textContent = `依頼者: 未設定`;
            infoDiv.appendChild(noReqDisplay);
        }

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'item-controls';

        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.min = '0';
        numInput.value = state.orders[item.name] || 0;
        
        numInput.onchange = (e) => {
            const val = parseInt(e.target.value);
            state.orders[item.name] = val < 0 ? 0 : val;
            saveStateToURL();
            renderConfirmScreen();
        };

        controlsDiv.appendChild(numInput);
        div.appendChild(infoDiv);
        div.appendChild(controlsDiv);
        container.appendChild(div);
    });
}

function renderConfirmScreen() {
    const remarkArea = document.getElementById('display-remark-area');
    const remarkText = document.getElementById('display-remark-text');

    if (state.orderRemark && state.orderRemark.trim() !== '') {
        remarkText.textContent = state.orderRemark;
        remarkArea.style.display = 'block';
    } else {
        remarkArea.style.display = 'none';
    }

    const list = document.getElementById('confirm-list');
    list.innerHTML = '';
    let hasOrder = false;

    state.itemList.forEach(item => {
        const count = state.orders[item.name];
        
        if (count > 0) {
            hasOrder = true;
            const li = document.createElement('li');
            
            let displayName = item.name;
            if (item.desc) displayName += ` <small>(${item.desc})</small>`;

            let staffTag = '';
            if (item.requester) {
                staffTag = `<div class="item-requester-display" style="margin-top:0;">依頼者: ${item.requester}</div>`;
            }

            li.innerHTML = `
                <div class="order-details">
                    <span>${displayName}</span>
                    ${staffTag}
                </div>
                <strong>${count} 個</strong>
            `;
            list.appendChild(li);
        }
    });

    if (!hasOrder) {
        list.innerHTML = '<li class="empty-msg">注文アイテムはありません</li>';
    }
}

// ==========================================
// 5. イベント処理
// ==========================================

function updateRemark() {
    const remark = document.getElementById('order-remark');
    state.orderRemark = remark.value;
    saveStateToURL();
    renderConfirmScreen();
}

function addStaff() {
    const input = document.getElementById('new-staff-name');
    const name = input.value.trim();
    if (name && !state.staffList.includes(name)) {
        state.staffList.push(name);
        input.value = '';
        alert(`${name} さんを依頼者リストに追加しました。`);
        saveStateToURL();
        renderAll();
    } else if (state.staffList.includes(name)) {
        alert('その名前は既に存在します。');
    }
}

function addOrUpdateItem() {
    const nameInput = document.getElementById('new-item-name');
    const descInput = document.getElementById('new-item-desc');
    const staffSelect = document.getElementById('admin-staff-select');
    
    const name = nameInput.value.trim();
    const desc = descInput.value.trim();
    const requester = staffSelect.value;

    if (!name) {
        alert("備品名を入力してください");
        return;
    }

    const existingItemIndex = state.itemList.findIndex(item => item.name === name);

    if (existingItemIndex > -1) {
        state.itemList[existingItemIndex].desc = desc;
        state.itemList[existingItemIndex].requester = requester;
        alert(`「${name}」の情報を更新しました。\n(依頼者: ${requester || '未設定'})`);
    } else {
        state.itemList.push({ 
            name: name, 
            desc: desc, 
            requester: requester 
        });
        state.orders[name] = 0;
        alert(`「${name}」を追加しました。\n(依頼者: ${requester || '未設定'})`);
    }

    nameInput.value = '';
    descInput.value = '';
    staffSelect.value = "";
    
    saveStateToURL();
    renderAll();
}

function switchTab(tabName) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`panel-${tabName}`).classList.add('active');
    
    const buttons = document.querySelectorAll('.tab-btn');
    if(tabName === 'admin') buttons[0].classList.add('active');
    if(tabName === 'order') buttons[1].classList.add('active');
    if(tabName === 'confirm') buttons[2].classList.add('active');
}

// ★修正: コピー成功時にボタンの色を変える機能を追加
function copyToClipboard() {
    saveStateToURL();
    const url = window.location.href;
    const btn = document.getElementById('copy-btn'); // ボタン要素を取得

    navigator.clipboard.writeText(url).then(() => {
        // --- 成功時の処理 ---
        
        // 1. ボタンに青色のクラスを追加
        btn.classList.add('btn-copied');
        // 2. ボタンの文字を変更
        const originalText = '現在の状態をURLとしてコピー';
        btn.textContent = 'URLをコピーしました！';
        
        alert('共有用URLをコピーしました！');
        
        // 3. 3秒後に元の状態（グレー色・元の文字）に戻す
        setTimeout(() => {
            btn.classList.remove('btn-copied');
            btn.textContent = originalText;
        }, 3000);

    }).catch(err => {
        // エラー時の処理（古いブラウザなど）
        console.error('コピー失敗', err);
        prompt('以下のURLをコピーしてください:', url);
    });
}