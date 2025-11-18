// 等整個 DOM 載入完成再綁定事件
document.addEventListener("DOMContentLoaded", function () {
  const dogNameInput = document.getElementById("dogName");
  const birthDateInput = document.getElementById("birthDate");
  const calcBtn = document.getElementById("calcBtn");
  const resetBtn = document.getElementById("resetBtn");

  const errorMessageEl = document.getElementById("errorMessage");
  const resultCard = document.getElementById("resultCard");
  const resultTitle = document.getElementById("resultTitle");
  const resultDogAge = document.getElementById("resultDogAge");
  const resultHumanAge = document.getElementById("resultHumanAge");

  // === localStorage 的 key ===
  const STORAGE_KEY = "dogAgeCalculatorData";

  // 體型對照表資料（來自你提供的表格）
  const ageTable = {
    small: {
      1: 15,
      2: 24,
      3: 28,
      4: 32,
      5: 36,
      6: 40,
      7: 44,
      8: 48,
      9: 52,
      10: 56,
      11: 60,
      12: 64,
      13: 68,
      14: 72,
      15: 76,
      16: 80,
    },
    medium: {
      1: 15,
      2: 24,
      3: 28,
      4: 32,
      5: 36,
      6: 42,
      7: 47,
      8: 51,
      9: 56,
      10: 60,
      11: 65,
      12: 69,
      13: 74,
      14: 78,
      15: 83,
      16: 87,
    },
    large: {
      1: 15,
      2: 24,
      3: 28,
      4: 32,
      5: 36,
      6: 45,
      7: 50,
      8: 55,
      9: 61,
      10: 66,
      11: 72,
      12: 77,
      13: 82,
      14: 88,
      15: 93,
      16: 120,
    },
  };

  // === 主流程：按下「計算」按鈕 ===
  calcBtn.addEventListener("click", function () {
    const dogName = dogNameInput.value.trim();
    const birthDateValue = birthDateInput.value;
    const dogSize = getSelectedDogSize();

    // 1. 基本輸入檢查
    if (!dogName) {
      showError("請先輸入狗狗的名字。");
      hideResult();
      return;
    }

    if (!dogSize) {
      showError("請選擇狗狗的體型。");
      hideResult();
      return;
    }

    if (!birthDateValue) {
      showError("請選擇狗狗的出生日期。");
      hideResult();
      return;
    }

    const birthDate = new Date(birthDateValue);
    const today = new Date();

    if (isNaN(birthDate.getTime())) {
      showError("出生日期格式有點怪怪的，請重新選擇。");
      hideResult();
      return;
    }

    if (birthDate > today) {
      showError("狗狗還沒出生嗎？請確認出生日期是否正確。");
      hideResult();
      return;
    }

    // 2. 計算狗狗實際年齡（以年為單位，可能是小數）
    const diffMs = today - birthDate;
    const msPerYear = 1000 * 60 * 60 * 24 * 365.25; // 粗略計算一年
    const dogYears = diffMs / msPerYear;

    if (dogYears < 0) {
      showError("計算結果不合理，請檢查輸入的日期。");
      hideResult();
      return;
    }

    // 3. 依照體型與對照表轉成「人類歲數」
    const humanYears = convertDogToHumanAgeBySize(dogYears, dogSize, ageTable);

    // 4. 更新畫面
    clearError();

    const displayDogYears = dogYears.toFixed(1); // 顯示 1 位小數
    const displayHumanYears = Math.round(humanYears); // 四捨五入到整歲

    resultTitle.textContent = `${dogName} 的年齡結果：`;
    resultDogAge.textContent = `🐾 狗狗實際年齡：約 ${displayDogYears} 歲`;
    resultHumanAge.textContent = `👤 換算成人類年齡：約 ${displayHumanYears} 歲（${getSizeLabel(
      dogSize
    )}）`;

    showResult();

    // === 保存結果到 localStorage ===
    saveToLocalStorage({
      dogName: dogName,
      dogSize: dogSize,
      birthDate: birthDateValue,
      displayDogYears: displayDogYears,
      displayHumanYears: displayHumanYears,
    });
  });

  // === 重填按鈕功能 ===
  resetBtn.addEventListener("click", function () {
    // 清空名字
    dogNameInput.value = "";

    // 清空日期
    birthDateInput.value = "";

    // 體型選回預設值（小型犬）
    const smallDogRadio = document.querySelector(
      'input[name="dogSize"][value="small"]'
    );
    if (smallDogRadio) smallDogRadio.checked = true;

    // 清空錯誤訊息與結果
    clearError();
    hideResult();

    // === 清空 localStorage ===
    clearLocalStorage();
  });

  // 取得目前勾選的狗狗體型
  function getSelectedDogSize() {
    const radios = document.querySelectorAll('input[name="dogSize"]');
    for (const radio of radios) {
      if (radio.checked) return radio.value;
    }
    return null;
  }

  // 將英文的 size value 轉成中文顯示用字
  function getSizeLabel(size) {
    switch (size) {
      case "small":
        return "小型犬";
      case "medium":
        return "中型犬";
      case "large":
        return "大型犬";
      default:
        return "";
    }
  }

  /**
   * 使用「狗年齡對照表 + 體型」換算成「人類年齡」
   *
   * 規則：
   *  - 若 < 1 歲：以 1 歲約 15 人歲，做等比例推估
   *  - 若 >= 1 歲：四捨五入到整數歲數，並夾在 1~16 之間
   *  - 再依照體型，從對照表中取得人類歲數
   */
  function convertDogToHumanAgeBySize(dogYears, size, table) {
    if (dogYears <= 0) return 0;

    // 小於 1 歲，用比例推估
    if (dogYears < 1) {
      return dogYears * 15;
    }

    let age = Math.round(dogYears);

    // 限制在表格範圍內（1 ~ 16 歲）
    if (age < 1) age = 1;
    if (age > 16) age = 16;

    const group = table[size];
    if (!group || !group[age]) {
      // 正常情況不會進來，保底處理
      return dogYears * 7;
    }

    return group[age];
  }

  // === 畫面顯示 / 錯誤處理的小工具函式 ===
  function showError(message) {
    errorMessageEl.textContent = message;
  }

  function clearError() {
    errorMessageEl.textContent = "";
  }

  function showResult() {
    resultCard.style.display = "block";
  }

  function hideResult() {
    resultCard.style.display = "none";
  }

  // === localStorage 相關函式 ===
  // 保存計算結果到 localStorage
  function saveToLocalStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log("✓ 結果已保存至 localStorage");
    } catch (error) {
      console.error("✗ localStorage 保存失敗:", error);
    }
  }

  // 從 localStorage 讀取之前的計算結果
  function loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("✗ localStorage 讀取失敗:", error);
    }
    return null;
  }

  // 清空 localStorage 的計算結果
  function clearLocalStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log("✓ localStorage 已清空");
    } catch (error) {
      console.error("✗ localStorage 清空失敗:", error);
    }
  }

  // 頁面加載時，恢復上次的計算結果
  function restorePreviousResult() {
    const savedData = loadFromLocalStorage();
    if (savedData) {
      // 恢復表單內容
      dogNameInput.value = savedData.dogName;
      birthDateInput.value = savedData.birthDate;

      // 恢復選中的體型
      const sizeRadio = document.querySelector(
        `input[name="dogSize"][value="${savedData.dogSize}"]`
      );
      if (sizeRadio) {
        sizeRadio.checked = true;
      }

      // 恢復結果顯示
      resultTitle.textContent = `${savedData.dogName} 的年齡結果：`;
      resultDogAge.textContent = `🐾 狗狗實際年齡：約 ${savedData.displayDogYears} 歲`;
      resultHumanAge.textContent = `👤 換算成人類年齡：約 ${savedData.displayHumanYears} 歲（${getSizeLabel(
        savedData.dogSize
      )}）`;

      showResult();
      console.log("✓ 已恢復上次的計算結果");
    }
  }

  // === 頁面初始化時，恢復上次結果 ===
  restorePreviousResult();
});
