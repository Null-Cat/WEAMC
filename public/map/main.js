function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 0, lng: 0 },
    zoom: 5,
    streetViewControl: false,
    mapTypeControlOptions: {
      mapTypeIds: ["minecraftmap"],
    },
  });
  const minecraftMapType = new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
      //const normalizedCoord = getNormalizedCoord(coord, zoom);

      //if (!normalizedCoord) {
      //  return "";
      //}
      //const bound = Math.pow(2, zoom);
      return (
        "http://127.0.0.1/renderedchunks" +
        "/" +
        "5" +
        "/" +
        coord.x +
        "/" +
        coord.y +
        ".png"
      );
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 5,
    minZoom: 5,
    //radius: 1738000,
    name: "Minecraft Map"
  });
  map.mapTypes.set("minecraftmap", minecraftMapType);
  map.setMapTypeId("minecraftmap");
}

// Normalizes the coords that tiles repeat across the x axis (horizontally)
// like the standard Google map tiles.
function getNormalizedCoord(coord, zoom) {
  const y = coord.y;
  let x = coord.x;
  // tile range in one direction range is dependent on zoom level
  // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
  const tileRange = 1 << zoom;

  // don't repeat across y-axis (vertically)
  if (y < 0 || y >= tileRange) {
    return null;
  }

  // repeat across x-axis
  if (x < 0 || x >= tileRange) {
    x = ((x % tileRange) + tileRange) % tileRange;
  }
  return { x: x, y: y };
}