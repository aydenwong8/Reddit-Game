import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet, apiPost } from "./api";
import StartScreen from "./components/StartScreen";
import GameHeader from "./components/GameHeader";
import ImageFrame from "./components/ImageFrame";
import OptionsPanel from "./components/OptionsPanel";
import FeedbackBar from "./components/FeedbackBar";
import PlayAgainButton from "./components/PlayAgainButton";

function shuffle(arr) {
  const copy = [...arr];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }

  return copy;
}

function pickTwoOthers(allData, idx) {
  if (!allData || allData.length <= 1) {
    return [];
  }

  const pool = [];

  for (let i = 0; i < allData.length; i += 1) {
    if (i !== idx) {
      pool.push(i);
    }
  }

  if (pool.length <= 2) {
    return pool.slice(0, 2);
  }

  const a = Math.floor(Math.random() * pool.length);
  const first = pool.splice(a, 1)[0];
  const b = Math.floor(Math.random() * pool.length);
  const second = pool.splice(b, 1)[0];

  return [first, second];
}

export default function App() {
  // Legacy state variables mapped from pixel_game_template.html:
  // data, active, currentIndex, startIndex, allData, initialIndex, usedInitial(sessionStorage)
  const [allData, setAllData] = useState([]);
  const [initialIndex, setInitialIndex] = useState(-1);
  const [startIndex, setStartIndex] = useState(-1);

  const [startVisible, setStartVisible] = useState(true);
  const [gameHeaderVisible, setGameHeaderVisible] = useState(false);

  const [data, setData] = useState(null);
  const [active, setActive] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [imageSrc, setImageSrc] = useState("");
  const [titleText, setTitleText] = useState("Mystery Meme");
  const [uiVisible, setUiVisible] = useState(true);
  const [playAgainVisible, setPlayAgainVisible] = useState(false);

  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackColor, setFeedbackColor] = useState("#ffea00");

  const [options, setOptions] = useState(["", "", ""]);
  const [optionsVisible, setOptionsVisible] = useState(true);

  const [bootstrapError, setBootstrapError] = useState("");
  const usedInitialRef = useRef(null);

  useEffect(() => {
    usedInitialRef.current = sessionStorage.getItem("initialShown");

    apiGet("/api/game/bootstrap")
      .then((payload) => {
        const gameData = Array.isArray(payload.allData) ? payload.allData : [];
        const serverInitialIndex = Number.isInteger(payload.initialIndex) ? payload.initialIndex : -1;

        setAllData(gameData);
        setInitialIndex(serverInitialIndex);

        if (serverInitialIndex >= 0 && !usedInitialRef.current) {
          setStartIndex(serverInitialIndex);
        } else {
          setStartIndex(gameData.length ? Math.floor(Math.random() * gameData.length) : -1);
        }
      })
      .catch((err) => {
        setBootstrapError(err.message || "Failed to load game data.");
      });
  }, []);

  const canRenderGame = useMemo(() => allData.length > 0 && !bootstrapError, [allData.length, bootstrapError]);

  function msg(text, color) {
    setFeedbackText(text);
    setFeedbackColor(color);
  }

  function renderOptions(nextData, nextIndex) {
    if (!nextData) {
      return;
    }

    if (allData.length >= 3) {
      const others = pickTwoOthers(allData, nextIndex);
      const choices = [allData[others[0]].name, allData[others[1]].name, nextData.name];
      setOptions(shuffle(choices));
      setOptionsVisible(true);
    } else {
      setOptionsVisible(false);
      setOptions(["", "", ""]);
    }
  }

  function initGameByIndex(idx) {
    if (idx < 0 || idx >= allData.length) {
      return;
    }

    const nextData = allData[idx];

    setCurrentIndex(idx);
    setData(nextData);
    setActive(true);
    setImageSrc(nextData.images["3"]);
    setTitleText("Mystery Meme");
    setUiVisible(true);
    setPlayAgainVisible(false);
    msg("", "#ffea00");
    renderOptions(nextData, idx);
  }

  function startGame() {
    if (!canRenderGame) {
      return;
    }

    setStartVisible(false);
    setGameHeaderVisible(true);

    if (initialIndex >= 0 && !usedInitialRef.current) {
      sessionStorage.setItem("initialShown", "1");
    }

    initGameByIndex(startIndex);
  }

  function endGame(win) {
    if (!data) {
      return;
    }

    setActive(false);
    setImageSrc(data.images.answer);
    setTitleText(data.name);
    setUiVisible(false);
    setPlayAgainVisible(true);
    msg(win ? "✅ CORRECT!" : "❌ GAME OVER", win ? "#00e676" : "#ff3d00");
  }

  function doGuessOption(choiceIndex) {
    if (!active || !data) {
      return;
    }

    const choice = (options[choiceIndex] || "").trim().toLowerCase();

    if (!choice) {
      return;
    }

    const target = data.name.trim().toLowerCase();

    if (choice === target || target.includes(choice) || choice.includes(target)) {
      endGame(true);
    } else {
      endGame(false);
    }
  }

  async function nextRound() {
    if (!allData.length) {
      return;
    }

    const payload = await apiPost("/api/game/round", { currentIndex });
    initGameByIndex(payload.nextIndex);
  }

  function giveUp() {
    if (!data) {
      return;
    }

    endGame(false);

    setTimeout(() => {
      nextRound().catch(() => {
        msg("❌ GAME OVER", "#ff3d00");
      });
    }, 1200);
  }

  function exitGame() {
    // Requested behavior in migration: exit returns to start screen.
    setStartVisible(true);
    setGameHeaderVisible(false);
    setData(null);
    setActive(true);
    setCurrentIndex(-1);
    setImageSrc("");
    setTitleText("Mystery Meme");
    setUiVisible(true);
    setPlayAgainVisible(false);
    setFeedbackText("");
    setFeedbackColor("#ffea00");
    setOptions(["", "", ""]);
    setOptionsVisible(true);

    if (allData.length) {
      setStartIndex(Math.floor(Math.random() * allData.length));
    }
  }

  if (bootstrapError) {
    return (
      <div className="pixel-card">
        <FeedbackBar message={bootstrapError} color="#ff3d00" />
      </div>
    );
  }

  return (
    <div className="pixel-card">
      {startVisible && <StartScreen onStart={startGame} onExit={exitGame} disabled={!canRenderGame} />}

      <GameHeader visible={gameHeaderVisible} title={titleText} onExit={exitGame} />

      <ImageFrame src={imageSrc} alt={data ? data.name : ""} />

      <OptionsPanel
        visible={uiVisible && canRenderGame}
        optionsVisible={optionsVisible}
        options={options}
        onGuess={doGuessOption}
        onGiveUp={giveUp}
      />

      <FeedbackBar message={feedbackText} color={feedbackColor} />

      <PlayAgainButton
        visible={playAgainVisible}
        onClick={() => {
          nextRound().catch((err) => {
            msg(err.message || "❌ GAME OVER", "#ff3d00");
          });
        }}
      />
    </div>
  );
}
