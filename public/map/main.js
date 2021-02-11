var map = new ol.Map({
  target: 'map',
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: "http://127.0.0.1/renderedchunks/{z}/{x}/{y}.png",
        wrapX: false,
        maxZoom: 5,
        minZoom: 5,
        transition: 0,
      }),
    }) ],
  view: new ol.View({
    center: [0, 0],
    zoom: 5,
  }),
});