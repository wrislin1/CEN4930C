// Global vars
let rawData ;
let fixes = [] ;
let txt = [];

// A lot of trial and error to get things to fit
// on the canvas here.  Probably a more intelligent
// programmatic way to do this...
let minLat = 33.0 ;
//let maxLat = 34.5 ;
let maxLat = 35.0 ;
//let maxLng = -85.0 ;
let maxLng = -85.5 ;
//let minLng = -84.0 ;
let minLng = -83.5 ;
let fixSeq = 0 ;
let iterations = 10 ;
let rcvrColor = 0 ;
let planeColor = 0 ;
let labelColor = 0 ;
let backColor = 0 ;
let planeDict = new p5.TypedDict() ;

// As a non-JS programmer, the apparently typeless (or at least "type-flexible")
// nature of this stuff sort of weirds me out.  But I think that imposing static
// typing on top of JS for protection is what the TypeScript transpiler does
// https://stackify.com/typescript-vs-javascript-migrate/
// But I don't enough to use it yet.

// Basically a struct (class with no methods and all members public)
// to hold x, y, z canvas coordinates
class PointLoc {
  constructor( x, y, z) {
    this.x = x ;
    this.y = y ;
    this.z = z ;
  }
}

// Holds lat, long and altitude.  Used for planes and receiver (car)
class GPSloc {
  constructor( lat, long, alt ) {
    this.lat = lat ;
    this.long = long ;
    this.alt = alt ;
  }
}

// Id info for plane
class Plane {
  constructor( hexId, flightId, timesSeen ) {
    this.hexId = hexId ;
    this.flightId = flightId ;
    this.timesSeen = timesSeen ;
  }

}

// Combines gps data for receiver with gps data for plane and
// plane id info into one struct
class Fix {
  constructor( rcvr, adsb, plane ) {
    this.rcvr = rcvr ;
    this.adsb = adsb ;
    this.plane = plane ;
  }
}

// This runs first, and execution does not resume until it is done.
// Need to run a local webserver on port 8000 to serve this data
// python3 -m http.server
// in the folder containing the merged CSV file
function preload( ) {
  rawData = loadTable("http://localhost:8000/valdosta_gps_adsb.csv", "csv", 'header' ) ;
}

// Debugging
function printRawData( ) {
  for( i = 0 ; i < rawData.getRowCount ( ) ; i++ ) {
    console.log( rawData.get(i, 'flight_id' )) ;
  }
}

// In the p5js idiom, this method is run once, after preload ( ) but before draw ()
function setup() {
  hover = createCanvas(800, 600);

  //printRawData( ) ;

  // "parse" input CSV into the necessary structs to create a Fix object
  // the actual parsing was done by the p5js loadTable function, of course
  // sort of like how Pandas data frames work to load in csv.
  for( i = 0 ; i < rawData.getRowCount( ) ; i ++ ) {
    theRcvr = new GPSloc( rawData.get(i, 'lat'), rawData.get(i, 'lon'), rawData.get(i, 'alt')) ;
    theXmitter = new GPSloc( rawData.get(i, 'lat_plane'), rawData.get(i, 'lng_plane'), rawData.get(i, 'altitude')) ;
    thePlane = new Plane( rawData.get(i, 'hex_id'), rawData.get(i, 'flight_id'), rawData.get(i, 'in_view')) ;
    fixes.push( new Fix( theRcvr, theXmitter, thePlane ) );
    //console.log ( i + ' ' + fixes[i].plane.hexId) ;
    rcvrColor = color ( 255, 0, 255 ) ;
    planeColor = color( 64 ,64, 255) ;
    labelColor = color( 255, 0, 0 ) ;
    backColor = 220 ;
    background( backColor ) ;

    // Slow down drawing for effect
    frameRate ( 10 ) ;
  }
}

// In the p5js idiom, this method is run repeatedly forever
function draw() {

  // Clear the canvas when one map is complete
//  hovertext.forEach((item, i) => {
//    text(item.flight,item.planeX,item.planeY);
//  });
if(mouseIsPressed)
{

txt.forEach((item, i) => {
      if(((item.planeX - 5<mouseX) && (item.planeX + 5>mouseX)) && ((item.planeY - 5< mouseY)&&(item.planeY  + 5>mouseY)))
      {
        text( item.flight, item.planeX, item.planeY ) ;
        fill(planeColor)
      }
  });


}

  fixSeq ++ ;
  if( fixSeq >= fixes.length ) {
    fixSeq = 0 ;
    planeDict.clear ( ) ;
    iterations ++ ;
    background( backColor ) ;
  }

  // Get canvas-based x, y coordinates by mapping the GPS coordinates
  // Note that latitude increases as Y decreases, and longitude
  // (which is negative here in the Western hemisphere) decreases with
  // increasing X.
  // 0,0 is the upper left corner of the canvas.
  //
  // The map function looks magical, but it is actually a straightforward
  // linear transformation of the first argument.  Basically, it rescales
  // which is needed since the canvas is big and the values of latitude
  // and longitude are small.
  xRcvr = map( fixes[fixSeq].rcvr.long, maxLng, minLng, 0, width ) ;
  yRcvr = map( fixes[fixSeq].rcvr.lat, maxLat, minLat, 0, height ) ;
  planeX = map( fixes[fixSeq].adsb.long, maxLng, minLng, 0, height ) ;
  planeY = map( fixes[fixSeq].adsb.lat, maxLat, minLat, 0, height ) ;

  // draw a square for the receiver (car)
  fill ( rcvrColor ) ;
  square( xRcvr, yRcvr, 5 ) ;

  // Remember planes seen by hex_id and draw a line from
  // the previous location to the current location
  planeHexId = fixes[fixSeq].plane.hexId ;
  flight = fixes[fixSeq].plane.flightId ;

  // If we have seen it before, draw a line from the previous
  // fix for this aircraft to the current one
  if( planeDict.hasKey( planeHexId) ){
    stroke( planeColor ) ;
    prevLoc = planeDict.get( planeHexId) ;
    prevX = prevLoc.x ;
    prevY = prevLoc.y ;
    line ( prevX, prevY, planeX, planeY )
  } else {
    // Haven't seen it before, draw the point and label it.
    prevLoc = new PointLoc( planeX, planeY, 0 ) ;
    planeDict.set( planeHexId, prevLoc ) ;
    if( iterations % 2 != 0 ) {
      stroke( labelColor ) ;
      fill(labelColor ) ;
      textSize(10) ;

      // XXXXX labels mean flight was not transmitting the flight id
      if( flight != 'XXXXX') {
        text( flight, planeX, planeY ) ;
      }
    }
  }

  // Draw a small circle for the plane
  // ToDo: find a tiny little plane image to use here...
  fill( planeColor ) ;
  noStroke( ) ;
  circle( planeX, planeY, 5 )
txt[fixSeq] = {flight:flight,planeX:planeX,planeY:planeY};

}
