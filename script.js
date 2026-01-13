// ==========================================
// 1. 初期データの設定
// ==========================================

const defaultData = {
    staffList: [], 
    itemList: [], 
    orders: {},
    orderRemark: '',
    
    // ★Slack通知先のメンバーリスト（最大7人分）
    // ここに指定された名前を初期値として設定しました
    slackMembers: [
        '@佐々木仁孝',
        '@真栄城　仁',
        '@比嘉りえ',
        '@小柳将志',
        '@町田律子',
        '@小嶺千賀子',
        '' // 7人目は空欄（必要に応じて入力可能）
    ]
};

// 状態管理変数（初期データをコピーして使用）
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
            // URLからデータを復元
            const jsonString = decodeURIComponent(escape(window.atob(hash)));
            const loadedState = JSON.parse(jsonString);

            // デフォルトデータと、読み込んだデータを結合
            // ※URLにslackMembersの情報が保存されている場合は、デフォルト(佐々木さん達)ではなく
            //   URLの情報(上書きされた情報)が優先されます。
            state = { ...defaultData, ...loadedState };

            // 古いデータ形式の互換性対応（assignments -> requester）
            if (loadedState.assignments) {
                state.itemList.forEach(item => {
                    if (!item.requester && loadedState.assignments[item.name]) {
                        item.requester = loadedState.assignments[item.name];
                    }
                });
            }
            
            // slackMembers配列の整合性チェック
            if (!state.slackMembers || state.slackMembers.length !== 7) {
                // もし壊れていた場合はデフォルトに戻す
                state.slackMembers = defaultData.slackMembers;
            }

        } catch (e) {
            console.error("読み込みエラー", e);
        }
    }
    
    // 注文数の初期化
    state.itemList.forEach(item => {
        if (state.orders[item.name] === undefined) state.orders[item.name] = 0;
    });
}

function saveStateToURL() {
    // データを文字列化してURLに保存
    const jsonString = JSON.stringify(state);
    const hash = window.btoa(unescape(encodeURIComponent(jsonString)));
    window.history.replaceState(null, null, '#' + hash);
}

function resetData() {
    if (confirm("全てのデータを削除して初期状態に戻しますか？")) {
        // リセット時はデフォルトデータ（Slackメンバー含む）に戻ります
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
    renderSlackInputs(); // Slack入力欄の描画
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

// ★Slack入力欄に、指定された名前をセットする関数
function renderSlackInputs() {
    const inputs = document.querySelectorAll('.slack-member-input');
    inputs.forEach((input, index) => {
        // stateに保存されている値（初期値は佐々木さん等の名前）を表示
        input.value = state.slackMembers[index] || '';
    });
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

function updateSlackMembers() {
    const inputs = document.querySelectorAll('.slack-member-input');
    // 入力値を配列にして保存（変更があった場合、URLに保存される）
    state.slackMembers = Array.from(inputs).map(input => input.value);
    saveStateToURL();
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

function copyToClipboard() {
    saveStateToURL();
    const url = window.location.href;
    const btn = document.getElementById('copy-btn');

    navigator.clipboard.writeText(url).then(() => {
        btn.classList.add('btn-copied');
        const originalText = '現在の状態をURLとしてコピー';
        btn.textContent = 'URLをコピーしました！';
        
        setTimeout(() => {
            btn.classList.remove('btn-copied');
            btn.textContent = originalText;
        }, 3000);

    }).catch(err => {
        console.error('コピー失敗', err);
        prompt('以下のURLをコピーしてください:', url);
    });
}

// Slack用メッセージ作成・起動
function copyAndOpenSlack() {
    saveStateToURL();
    const url = window.location.href;
    
    // 入力欄からメンション（@名前）を取得して、空欄以外をつなげる
    const mentions = state.slackMembers.filter(m => m.trim() !== '');
    
    let message = "";
    if (mentions.length > 0) {
        // 名前をスペース区切りで並べる
        message += mentions.join(' ') + "\n\n";
    }
    message += "お疲れ様です。備品の注文をお願いします。\n";
    message += "以下のリンクから注文内容を確認してください。\n\n";
    message += url;

    navigator.clipboard.writeText(message).then(() => {
        const btn = document.getElementById('slack-btn');
        btn.classList.add('btn-copied');
        btn.textContent = 'メッセージをコピーしました！';

        alert("Slack用のメッセージをコピーしました！\nこの後Slackが開きますので、メッセージ入力欄に「貼り付け」て送信してください。");
        
        // Slackを起動
        window.open('slack://open'); 
        
        setTimeout(() => {
            btn.classList.remove('btn-copied');
            btn.textContent = 'Slack用メッセージをコピーして起動';
        }, 3000);

    }).catch(err => {
        console.error('コピー失敗', err);
        alert('コピーに失敗しました。手動でURLをコピーしてください。');
    });
}