from belfort.sentiment.nlp.scorer import score_text


def test_score_text_positive():
    s = score_text("Bitcoin is amazing! To the moon 🚀 great gains")
    assert s is not None
    assert s > 0.1


def test_score_text_negative():
    s = score_text("Bitcoin crash is terrible, massive losses and fear everywhere")
    assert s is not None
    assert s < -0.05


def test_score_text_too_short():
    assert score_text("hi") is None


def test_score_text_neutral():
    s = score_text("The price moved sideways during the session today")
    assert s is not None
    assert -0.3 < s < 0.3
