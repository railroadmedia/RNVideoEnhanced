export const getMP3Array = lesson => {
  let mp3s = [];
  if (lesson.mp3_no_drums_no_click_url)
    mp3s.push({
      id: 'mp3_no_drums_no_click_url',
      key: 'mp3_no_drums_no_click_url',
      value: lesson.mp3_no_drums_no_click_url
    });
  if (lesson.mp3_no_drums_yes_click_url)
    mp3s.push({
      id: 'mp3_no_drums_yes_click_url',
      key: 'mp3_no_drums_yes_click_url',
      value: lesson.mp3_no_drums_yes_click_url
    });

  if (lesson.mp3_yes_drums_no_click_url)
    mp3s.push({
      id: 'mp3_yes_drums_no_click_url',
      key: 'mp3_yes_drums_no_click_url',
      value: lesson.mp3_yes_drums_no_click_url
    });

  if (lesson.mp3_yes_drums_yes_click_url)
    mp3s.push({
      id: 'mp3_yes_drums_yes_click_url',
      key: 'mp3_yes_drums_yes_click_url',
      value: lesson.mp3_yes_drums_yes_click_url
    });

  return mp3s;
}

export const formatTimer = seconds => {
  const hours = parseInt(seconds / 3600);
  const minutes = parseInt((seconds -= hours * 3600) / 60);
  seconds -= minutes * 60;
  return {
    hours: `${hours < 10 ? 0 : ''}${hours}`,
    minutes: `${minutes < 10 ? 0 : ''}${minutes}`,
    seconds: `${seconds < 10 ? 0 : ''}${seconds}`
  };
};
