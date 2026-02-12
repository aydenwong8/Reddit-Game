const folderNames = [
  "Absolute_Cinema",
  "All_My_Homies_Hate",
  "Boardroom_Meeting_Suggestion",
  "Change_My_Mind",
  "Distracted_Boyfriend",
  "Friendship_ended",
  "Hide_the_Pain_Harold",
  "I_Bet_Hes_Thinking_About_Other_Women",
  "Is_This_A_Pigeon",
  "Pawn_Stars_Best_I_Can_Do",
  "Sad_Pablo_Escobar",
  "Surprised_Pikachu",
  "The_Rock_Driving",
  "The_Scroll_Of_Truth",
  "Two_Buttons",
  "Two_Paths",
  "Waiting_Skeleton",
  "Woman_Yelling_At_Cat",
  "cmon_do_something",
  "spiderman_pointing_at_spiderman"
];

const lastGenerated = "spiderman_pointing_at_spiderman";

function toEntry(folder) {
  return {
    name: folder.replaceAll("_", " "),
    clean_name: folder.replaceAll("_", " ").toLowerCase(),
    images: {
      "1": `/game_assets/${folder}/clue_1.png`,
      "2": `/game_assets/${folder}/clue_2.png`,
      "3": `/game_assets/${folder}/clue_3.png`,
      "4": `/game_assets/${folder}/clue_4.png`,
      "5": `/game_assets/${folder}/clue_5.png`,
      answer: `/game_assets/${folder}/ANSWER.png`
    }
  };
}

const allData = folderNames.map(toEntry);
const initialIndex = folderNames.findIndex((folder) => folder === lastGenerated);

export { allData, initialIndex };
