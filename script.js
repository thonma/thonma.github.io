(async () => {
  'use strict';

  // ==================================================
  // States
  // ==================================================
  const STATE = {
    IS_FIRST_TASK: true,
    DONE_TASK_IDXS: []
  };

  // ==================================================
  // Utility
  // ==================================================
  const shuffle = arr => {
    arr = [...arr];

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  };

  const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ==================================================
  // App
  // ==================================================
  const fetchRandomTask = async () => {
    const resp = await fetch('/tasks.json');
    const tasks = await resp.json();
    // console.log('tasks.length: ', tasks.length);

    const doneAll = tasks.length <= STATE.DONE_TASK_IDXS.length;
    // console.log('STATE.DONE_TASK_IDXS.length: ', STATE.DONE_TASK_IDXS.length);
    if (doneAll) {
      return null;
    }

    let taskIdx = getRandomInt(0, tasks.length - 1);
    while (STATE.DONE_TASK_IDXS.includes(taskIdx)) {
      taskIdx = getRandomInt(0, tasks.length - 1);
    }
    STATE.DONE_TASK_IDXS.push(taskIdx);
    return tasks[taskIdx];
  };

  const codeToElemsText = (opts = [], code = '') => {
    const optsElemsText = opts.map((opt, optIdx) => {
      const inputHtmlTxt = `<input type="radio" name="opt" value="${optIdx}" id="opt_${optIdx}" class="task_input" hidden>`;
      const labelHtmlTxt = `<label class="mb_1 d_block radio_label" for="opt_${optIdx}">// ${opt}</label>`;
      return `${inputHtmlTxt}${labelHtmlTxt}`;
    });
    // console.log(opts, optsElemsText);

    const codeElemsText = `<pre><code class="language-js">${code}</pre>`;
    const result = `<div class="radio_container ${STATE.IS_FIRST_TASK ? 'delay_shake' : ''}">${shuffle(optsElemsText).join('')}</div>${codeElemsText}`;
    STATE.IS_FIRST_TASK = false;
    return result;
  };

  // ==================================================
  // 初期表示時
  // ==================================================
  const init = async () => {
    const task = await fetchRandomTask();

    const allDone = task === null;
    if (allDone) {
      // おめでとう的なメッセージ表示 (現在は簡易的に実装しているので、もっとグラフィカルにする)
      const taskConatinerElem = document.querySelector('#task_container');
      taskConatinerElem.classList.add('done');
      taskConatinerElem.insertAdjacentText('beforeend', 'Congratulations!!🎉🎉🎉');

      const resetBtnConatinerElem = document.querySelector('#reset_btn_container');
      resetBtnConatinerElem.hidden = false;

      return;
    }

    const codeElemsText = codeToElemsText(task.opts, task.code);
    const taskConatinerElem = document.querySelector('#task_container');
    taskConatinerElem.insertAdjacentHTML('beforeend', codeElemsText);

    hljs.highlightAll();

    // ==================================================
    // プルダウン選択時、正解/不正解によって適用するスタイルを切り替える
    // ==================================================
    const taskInputElems = document.querySelectorAll('.task_input') || []; // NOTE: null防止
    taskInputElems.forEach(taskInputElem => {
      taskInputElem.addEventListener('change', event => {
        const targetElem = event.target;
        const selectedValue = targetElem.value;
        const isCorrect = selectedValue === '0'; // NOTE: ラジオボタンの値は文字列なので文字列と比較する必要がある

        targetElem.parentNode.classList.remove('delay_shake'); // FIXME: DOMの構造に依存しすぎ

        if (isCorrect) {
          targetElem.nextSibling.classList.remove('is_ng'); // FIXME: DOMの構造に依存しすぎ
          targetElem.nextSibling.classList.add('is_ok'); // FIXME: DOMの構造に依存しすぎ
        } else {
          targetElem.nextSibling.classList.remove('is_ok'); // FIXME: DOMの構造に依存しすぎ
          targetElem.nextSibling.classList.add('is_ng'); // FIXME: DOMの構造に依存しすぎ
          targetElem.nextSibling.classList.add('shake'); // FIXME: DOMの構造に依存しすぎ
        }

        // 全問正解したかどうかを判定
        const numOfTask = (document.querySelectorAll('.radio_container') || []).length;
        const numOfCorrect = (document.querySelectorAll('.is_ok') || []).length;
        if (numOfTask === numOfCorrect) {
          // 不正解のコメントを削除
          const labelElems = document.querySelectorAll('.radio_label') || [];
          labelElems.forEach(labelElem => {
            if (labelElem.classList.contains('is_ok') === false) {
              labelElem.parentNode.removeChild(labelElem); // FIXME: DOMの構造に依存しすぎ
            }
          });

          // 次の問題に進むボタンを表示
          const nextTaskBtnContainer = document.querySelector('#next_task_btn_container');
          nextTaskBtnContainer.hidden = false;
          nextTaskBtnContainer.classList.add('delay_shake');
        }
      });
    });
  };
  await init();

  // ==================================================
  // 次の問題を表示するボタンのクリックイベントハンドラ
  // ==================================================
  document.querySelector('#next_task_btn').addEventListener('click', () => {
    document.querySelector('#next_task_btn_container').hidden = true;
    document.querySelector('#task_container').innerHTML = '';
    init();
  });

  // ==================================================
  // 最初からもう1回やるボタンのクリックイベントハンドラ
  // ==================================================
  document.querySelector('#reset_btn').addEventListener('click', () => {
    const taskConatinerElem = document.querySelector('#task_container');
    taskConatinerElem.classList.remove('done');
    taskConatinerElem.innerHTML = '';
    STATE.DONE_TASK_IDXS = [];
    init();
  });

  // TODO: リリース時に削除する
  // 開発用チートコマンド ここから ==================================
  window.addEventListener('keyup', async evt => {
    // Shift + d
    if (evt.shiftKey && evt.key.toLowerCase() === 'd') {
      console.log('CHEAT: すべて完了済にする');
      const resp = await fetch('/tasks.json');
      const tasks = await resp.json();
      STATE.DONE_TASK_IDXS = tasks.map((_, idx) => idx);
      evt.preventDefault();
      return false;
    }
  });
  // 開発用チートコマンド ここまで ==================================

})();