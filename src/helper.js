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
