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

export const formatTime = seconds => {
    if (seconds < 1) return '0:00';
    let h = parseInt(seconds / 3600);
    let m = parseInt((seconds - h * 3600) / 60);
    let s = parseInt(seconds - m * 60 - h * 3600);

    s = s < 10 ? `0${s}` : `${s}`;
    m = m < 10 ? (h ? `0${m}` : `${m}`) : `${m}`;
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  }
