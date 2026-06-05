import pandas as pd
import numpy as np
from belfort.data.loader import load
from belfort.patterns.levels import detect_levels

df = load("BTCUSDT", "1D", since="1y")

levels = detect_levels(df, return_strengths=True)
print("Supports:", levels["support"])
print("Resistances:", levels["resistance"])
print("Total supports:", len(levels["support"]))
print("Total resistances:", len(levels["resistance"]))

