#!/bin/sh
wget -O data.osm --post-file=get_data.txt "https://overpass-api.de/api/interpreter"
