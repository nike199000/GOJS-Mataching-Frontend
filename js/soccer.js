var node_cnt = 0;
var current_back = 1;
var myDiagram = '';
var $ = '';
var PathPatterns = new go.Map();
var back_img_num = 1;
var canvas_width = 1000;
var pattern_div_width = 300;
var canvas_height = 620;
var top_height = 110;

function MultiNodePathLink() {
  go.Link.call(this);
}

go.Diagram.inherit(MultiNodePathLink, go.Link);

// Conversion functions that make use of the PathPatterns store of pattern Shapes
function convertPathPatternToShape(name) {
  if (!name) return null;
  return PathPatterns.get(name);
}

function changeToggle()
{
  var isChecked = document.getElementById("ch_toggle").checked;
  myDiagram.allowHorizontalScroll = isChecked;
  myDiagram.allowVerticalScroll = isChecked;
}

function init() {

  canvas_width = window.innerWidth - pattern_div_width;
  canvas_height = window.innerHeight - top_height;
  
  document.getElementById('pattern_div').style.height = canvas_height+'px';
  document.getElementById('myDiagramDiv').style.height = canvas_height+'px';
  $ = go.GraphObject.make;  

  myDiagram =
    $(go.Diagram, "myDiagramDiv",
      {
        fixedBounds: new go.Rect(0, 0, canvas_width, canvas_height),  // document is always 500x300 units
        "animationManager.isEnabled": false,
        "undoManager.isEnabled": true,
        "Changed": invalidateLinkRoutes,
        allowHorizontalScroll: false,  // disallow scrolling or panning
        allowVerticalScroll: false,
      });
  
  myDiagram.add(
        $(go.Part,  
        { layerName: "Background", position: new go.Point(0, 0),
            selectable: false, pickable: false },
        $(go.Picture, "images/Soccer/playground1.jpg")
        ));

  myOverview =
    $(go.Overview, "myOverviewDiv",  
    { observed: myDiagram, contentAlignment: go.Spot.Center });

    // when the document is modified, add a "*" to the title and enable the "Save" button
  myDiagram.addDiagramListener("Modified", function(e) {
      var button = document.getElementById("SaveButton");
      if (button) button.disabled = !myDiagram.isModified;
      var idx = document.title.indexOf("*");
      if (myDiagram.isModified) {
        if (idx < 0) document.title += "*";
      } else {
        if (idx >= 0) document.title = document.title.substr(0, idx);
      }
  });

  myDiagram.commandHandler.doKeyDown = function() {
    var e = myDiagram.lastInput;
    var cmd = myDiagram.commandHandler;
    if (e.key === "Del") {  // could also check for e.control or e.shift
      delete_();
    } else {
      go.CommandHandler.prototype.doKeyDown.call(cmd);
    }
  };

  myDiagram.addDiagramListener("ObjectSingleClicked",
    function(e) {
      var part = e.subject.part;
      var player_disable = ( part.data.category === 'player' || part.data.category === 'player1' ) ? false : true;
      var x = document.getElementsByClassName("player_number");
      var i;
      for (i = 0; i < x.length; i++) {
        x[i].disabled = player_disable;
      }

      
      //
      if (part instanceof MultiNodePathLink)
      {
        var one_node = myDiagram.findNodeForKey(part.data.key);
        var connected_nodes = new go.List();
        connected_nodes.add(myDiagram.findNodeForKey(part.data.key-3));
        connected_nodes.add(myDiagram.findNodeForKey(part.data.key-2));
        connected_nodes.add(myDiagram.findNodeForKey(part.data.key-1));
        connected_nodes.add(part);
        myDiagram.selectCollection(connected_nodes);
      }
    });

  function makePort(name, spot, output, input) {

    return $(go.Shape, "Circle",
    {
      fill: null,  // not seen, by default; set to a translucent gray by showSmallPorts, defined below
      stroke: null,
      desiredSize: new go.Size(20, 20),
      alignment: spot,  // align the port on the main Shape
      alignmentFocus: spot,  // just inside the Shape
      portId: name,  // declare this object to be a "port"
      fromSpot: spot, toSpot: spot,  // declare where links may connect at this port
      fromLinkable: output, toLinkable: input,  // declare whether the user may draw links to/from here
      cursor: "pointer"  // show a different cursor to indicate potential link point
    });
  }

  myDiagram.nodeTemplateMap.add("contrPoint",
    $(go.Node, go.Panel.Auto,
      new go.Binding("layerName", "isSelected", function(sel) { return sel ? "Foreground" : ""; }).ofObject(),
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("zOrder"),
      { locationSpot: go.Spot.Center },
      $(go.Shape, 
        { figure: "Circle", width: 20, height: 20, strokeWidth: 0, cursor:'pointer'},
        new go.Binding('fill', 'color').makeTwoWay()
      ),
      { // handle mouse enter/leave events to show/hide the ports
        mouseEnter: function(e, node) 
        {
          updateCtrlColor(node, 'rgba(250,0,0,0.5)');
        },
        mouseLeave: function(e, node) 
        { 
          var color = node.isSelected ? "rgba(250,0,0,0.5)" : "transparent";
          updateCtrlColor(node, color);
        },
        selectionChanged: function(part) {
          var color = part.isSelected ? "rgba(250,0,0,0.5)" : "transparent";
          updateCtrlColor(part, color);
        }
      }
    )
  );

  myDiagram.nodeTemplateMap.add("player",
  $(go.Node, go.Panel.Auto,
    new go.Binding("layerName", "isSelected", function(sel) { return sel ? "Foreground" : ""; }).ofObject(),
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    new go.Binding("zOrder"),
    { resizable: true, resizeObjectName: "PANEL" },
    { locationSpot: go.Spot.Center },
    { rotatable: true, rotateObjectName: "PANEL" },
    $(go.Panel, "Auto",
        { name: "PANEL"},
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        new go.Binding("angle").makeTwoWay(),
        
        $(go.Shape, "Rectangle",  // default figure
          {
            portId: "", // the default port: if no spot on link data, use closest side
            cursor: "pointer",
            fill: "transparent",
            strokeWidth: 0, 
            cursor:'pointer'
          }
        ),
        $(go.Picture,
          {
            margin: 10,
          },
          new go.Binding('width', 'size', function(size){
            return Math.min( parseInt(size.substr(0, size.indexOf(' '))), parseInt(size.substr(size.indexOf(' '))) );
          }), 
          new go.Binding('height', 'size', function(size){
            return Math.min( parseInt(size.substr(0, size.indexOf(' '))), parseInt(size.substr(size.indexOf(' '))) );
          }), 
          new go.Binding("source", 'back_img').makeTwoWay()
        ),
        $(go.TextBlock, 
           { textAlign: "center", verticalAlignment: go.Spot.Center},
           new go.Binding('font', 'size', function(size){
            var font_size = Math.max(50, Math.min(size.substr(0, size.indexOf(' ')), size.substr(size.indexOf(' ')))) * 16 / 50;
            return 'bold ' + font_size + 'pt serif';
           }),
           new go.Binding('text', 'text_name'), 
           new go.Binding('stroke', 'text_color').makeTwoWay() ),
        $(go.TextBlock, 
          new go.Binding('width', 'size', function(size){
            return Math.max( parseInt(size.substr(0, size.indexOf(' '))) - 10, 20 );
          }), 
          new go.Binding('height', 'size', function(size){
            return Math.max( parseInt(size.substr(size.indexOf(' '))) - 10, 20) ;
          }),
          { textAlign: "right", verticalAlignment: go.Spot.Bottom},
          new go.Binding('font', 'size', function(size){
            var font_size = Math.max(50, Math.min(size.substr(0, size.indexOf(' ')), size.substr(size.indexOf(' ')))) * 10 / 50;
            return 'bold ' + font_size + 'pt serif';
           }),
          new go.Binding('text', 'text_number'), 
          new go.Binding('stroke', 'text_color').makeTwoWay()
          )
    )
  )
);


myDiagram.nodeTemplateMap.add("player1",
  $(go.Node, go.Panel.Auto,
    new go.Binding("layerName", "isSelected", function(sel) { return sel ? "Foreground" : ""; }).ofObject(),
    new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
    new go.Binding("zOrder"),
    { locationSpot: go.Spot.Center },
    { rotatable: true, rotateObjectName: "PANEL" },
    { resizable: true, resizeObjectName: "PANEL" },
    $(go.Panel, "Auto",
        { name: "PANEL"},
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        new go.Binding("angle").makeTwoWay(),
        
        // $(go.Shape, "Rectangle",  // default figure
        //   {
        //     portId: "", // the default port: if no spot on link data, use closest side
        //     cursor: "pointer",
        //     fill: "transparent", 
        //     strokeWidth: 0, 
        //     cursor:'pointer'
        //   }
        // ),
        $(go.Picture,
          {
            'imageStretch': go.GraphObject.Uniform,
            margin: 10,
          },
          new go.Binding("source", 'back_img').makeTwoWay()
        ),
        $(go.TextBlock, 
          { margin: 10, textAlign: "center", verticalAlignment: go.Spot.Center, stroke: 'white'},
          new go.Binding('text', 'text_number'),
          new go.Binding('font', 'size', function(size){
            var font_size = Math.max(50, Math.min(size.substr(0, size.indexOf(' ')), size.substr(size.indexOf(' ')))) * 16 / 50;
            return 'bold ' + font_size + 'pt serif';
           })
        )
    )
  ));

  myDiagram.nodeTemplateMap.add("Equipment",
    $(go.Node, "Spot",
      new go.Binding("layerName", "isSelected", function(sel) { return sel ? "Foreground" : ""; }).ofObject(),
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("zOrder"),
      { locationSpot: go.Spot.Center },
      { selectable: true },
      { resizable: true, resizeObjectName: "PANEL" },
      { rotatable: true, rotateObjectName: "PANEL" },
      
      // the main object is a Panel that surrounds a TextBlock with a Shape
      $(go.Panel, "Auto",
        { name: "PANEL" },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        new go.Binding("angle").makeTwoWay(),
        // $(go.Shape, "Rectangle",  // default figure
        //   {
        //     portId: "", // the default port: if no spot on link data, use closest side
        //     cursor: "pointer",
        //     fill: "transparent"
        //   },
        //   new go.Binding("stroke", "isSelected", function(sel) { return sel ? "black" : "transparent"; }).makeTwoWay()
        // ),
        $(go.Picture,
          {
//            stretch: go.GraphObject.Fill,
            margin: 8
          },
          new go.Binding('imageStretch', 'isArea', function(isArea){
            if(isArea)
              return go.GraphObject.Fill;
            return go.GraphObject.Uniform;
          }),
          new go.Binding("source", 'source_img').makeTwoWay()
        )
    
      ),

      {
        selectionChanged: function(part) {
          var sel = part.isSelected ? "red" : "white";
          if( ! part.isSelected )
          {
            if( part.data.isArea )
            {
              myDiagram.commit(function(d) {
                d.model.set(part.data, "zOrder", -1);
              }, 'modified zOrder');
            }
          }
        }
      }
      // // four small named ports, one on each side:
      // makePort("TR", go.Spot.TopRight , true, true),
      // makePort("TL", go.Spot.TopLeft , true, true),
      // makePort("BR", go.Spot.BottomRight , true, true),
      // makePort("BL", go.Spot.BottomLeft , true, true),
      // makePort("T", go.Spot.Top, true, true),
      // makePort("L", go.Spot.Left, true, true),
      // makePort("R", go.Spot.Right, true, true),
      // makePort("B", go.Spot.Bottom, true, true),
      // { // handle mouse enter/leave events to show/hide the ports
      //   mouseEnter: function(e, node) { showSmallPorts(node, true); },
      //   mouseLeave: function(e, node) { showSmallPorts(node, false); }
      // }
    )
  );

  function showSmallPorts(node, show) {
    node.ports.each(function(port) {
      if (port.portId !== "") {  // don't change the default port, which is the big shape
        port.fill = show ? "rgba(0,0,0,.3)" : null;
      }
    });
  }

function definePathPattern(name, geostr, color, width, cap) {
  if (typeof name !== 'string' || typeof geostr !== 'string') throw new Error("invalid name or geometry string argument: " + name + " " + geostr);
  if (color === undefined) color = "black";
  if (width === undefined) width = 3;
  if (cap === undefined) cap = "square";
  PathPatterns.set(name,
    $(go.Shape,
      {
        name: "OBJSHAPE",
        geometryString: geostr,
        stroke: color,
        strokeWidth: width,
        strokeCap: cap
      }
    ));
  }
  definePathPattern("move_ball1", "M4 6 Q8 1 12 6 T20 6");
  definePathPattern("move1", "M0 0 M8 0 L16 0");
  definePathPattern("pass1", "M0 0 L1 0");
  definePathPattern("pass_11", "M0 0 L1 0");
  definePathPattern("shoot1", "M-3 -5 L10 -5 M-3 3 L10 3");

  definePathPattern("move_ball2", "M4 6 Q8 1 12 6 T20 6", 'rgb(251, 151, 0)');
  definePathPattern("move2", "M0 0 M8 0 L16 0", 'rgb(251, 151, 0)');
  definePathPattern("pass2", "M0 0 L1 0", 'rgb(251, 151, 0)');
  definePathPattern("pass_12", "M0 0 L1 0", 'rgb(251, 151, 0)');
  definePathPattern("shoot2", "M-3 -5 L10 -5 M-3 3 L10 3", 'rgb(251, 151, 0)');

  definePathPattern("move_ball3", "M4 6 Q8 1 12 6 T20 6", 'rgb(148, 122, 55)');
  definePathPattern("move3", "M0 0 M8 0 L16 0", 'rgb(148, 122, 55)');
  definePathPattern("pass3", "M0 0 L1 0", 'rgb(148, 122, 55)');
  definePathPattern("pass_13", "M0 0 L1 0", 'rgb(148, 122, 55)');
  definePathPattern("shoot3", "M-3 -5 L10 -5 M-3 3 L10 3", 'rgb(148, 122, 55)');

  definePathPattern("move_ball4", "M4 6 Q8 1 12 6 T20 6", 'rgb(250, 250, 250)');
  definePathPattern("move4", "M0 0 M8 0 L16 0", 'rgb(250, 250, 250)');
  definePathPattern("pass4", "M0 0 L1 0", 'rgb(250, 250, 250)');
  definePathPattern("pass_14", "M0 0 L1 0", 'rgb(250, 250, 250)');
  definePathPattern("shoot4", "M-3 -5 L10 -5 M-3 3 L10 3", 'rgb(250, 250, 250)');

  definePathPattern("move_ball5", "M4 6 Q8 1 12 6 T20 6", 'rgb(250, 0, 0)');
  definePathPattern("move5", "M0 0 M8 0 L16 0", 'rgb(250, 0, 0)');
  definePathPattern("pass5", "M0 0 L1 0", 'rgb(250, 0, 0)');
  definePathPattern("pass_15", "M0 0 L1 0", 'rgb(250, 0, 0)');
  definePathPattern("shoot5", "M-3 -5 L10 -5 M-3 3 L10 3", 'rgb(250, 0, 0)');

  definePathPattern("move_ball6", "M4 6 Q8 1 12 6 T20 6", 'rgb(0, 0, 250)');
  definePathPattern("move6", "M0 0 M8 0 L16 0", 'rgb(0, 0, 250)');
  definePathPattern("pass6", "M0 0 L1 0", 'rgb(0, 0, 250)');
  definePathPattern("pass_16", "M0 0 L1 0", 'rgb(0, 0, 250)');
  definePathPattern("shoot6", "M-3 -5 L10 -5 M-3 3 L10 3", 'rgb(0, 0, 250)');
  // myDiagram.linkTemplate =
  //   $(go.Link, go.Link.Bezier,  // the whole link panel
  //     {reshapable: true,},
  //     {
  //       routing: go.Link.AvoidsNodes,  // but this is changed to go.Link.Orthgonal when the Link is reshaped
  //       adjusting: go.Link.End,
  //       curve: go.Link.JumpOver,
  //       corner: 10,
  //       toShortLength: 4
  //     },
  //     $(go.Shape,  // the link path shape
  //       { isPanelMain: true, strokeWidth: 2 }),
  //     $(go.Shape,  // the arrowhead
  //       { toArrow: "Standard", stroke: null }),

        
  //   );




  function invalidateLinkRoutes(e) {
    // when a Node is moved, invalidate the route for all MultiNodePathLinks that go through it
    if (e.change === go.ChangedEvent.Property && e.propertyName === "location" && e.object instanceof go.Node) {
      var diagram = e.diagram;
      var node = e.object;
      if (node._PathLinks) {
        node._PathLinks.each(function(l) { l.invalidateRoute(); });
      }
    } else if (e.change === go.ChangedEvent.Remove && e.object instanceof go.Layer) {
      // when a Node is deleted that has MultiNodePathLinks going through it, invalidate those link routes
      if (e.oldValue instanceof go.Node) {
        var node = e.oldValue;
        if (node._PathLinks) {
          node._PathLinks.each(function(l) { l.invalidateRoute(); });
        }
      } else if (e.oldValue instanceof MultiNodePathLink) {
        // when deleting a MultiNodePathLink, remove all references to it in Node._PathLinks
        var link = e.oldValue;
        var diagram = e.diagram;
        var midkeys = link.data.path;
        if (Array.isArray(midkeys)) {
          for (var i = 0; i < midkeys.length; i++) {
            var node = diagram.findNodeForKey(midkeys[i]);
            if (node !== null && node._PathLinks) node._PathLinks.remove(link);
          }
        }
      }
    }
  }

  // ignores this.routing, this.adjusting, this.corner, this.smoothness, this.curviness
  MultiNodePathLink.prototype.computePoints = function() {
    // get the list of Nodes that should be along the path
    var nodes = [];
    if (this.fromNode !== null && this.fromNode.location.isReal()) {
      nodes.push(this.fromNode);
    }
    var midkeys = this.data.path;
    if (Array.isArray(midkeys)) {
      var diagram = this.diagram;
      for (var i = 0; i < midkeys.length; i++) {
        var node = diagram.findNodeForKey(midkeys[i]);
        if (node instanceof go.Node && node.location.isReal()) {
          nodes.push(node);
          // Optimization?: remember on each path Node all of
          // the MultiNodePathLinks that go through it;
          // but this optimization requires maintaining this cache
          // in a Diagram Changed event listener.
          var set = node._PathLinks;
          if (!set) set = node._PathLinks = new go.Set(/*go.Link*/);
          set.add(this);
        }
      }
    }
    if (this.toNode !== null && this.toNode.location.isReal()) {
      nodes.push(this.toNode);
    }

    // now do the routing
    this.clearPoints();
    var prevloc = null;
    var thisloc = null;
    var nextloc = null;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      thisloc = node.location;
      nextloc = (i < nodes.length - 1) ? nodes[i + 1].location : null;

      var prevpt = null;
      var nextpt = null;
      if (this.curve === go.Link.Bezier) {
        if (prevloc !== null && nextloc !== null) {
          var prevang = thisloc.directionPoint(prevloc);
          var nextang = thisloc.directionPoint(nextloc);
          var avg = (prevang + nextang) / 2;
          var clockwise = prevang > nextang;
          if (Math.abs(prevang - nextang) > 180) {
            avg += 180;
            clockwise = !clockwise;
          }
          if (avg >= 360) avg -= 360;
          prevpt = new go.Point(Math.sqrt(thisloc.distanceSquaredPoint(prevloc)) / 4, 0);
          prevpt.rotate(avg + (clockwise ? 90 : -90));
          prevpt.add(thisloc);
          nextpt = new go.Point(Math.sqrt(thisloc.distanceSquaredPoint(nextloc)) / 4, 0);
          nextpt.rotate(avg - (clockwise ? 90 : -90));
          nextpt.add(thisloc);
        } else if (nextloc !== null) {
          prevpt = null;
          nextpt = thisloc;  // fix this point after the loop
        } else if (prevloc !== null) {
          var lastpt = this.getPoint(this.pointsCount - 1);
          prevpt = thisloc;  // fix this point after the loop
          nextpt = null;
        }
      }

      if (prevpt !== null) this.addPoint(prevpt);
      this.addPoint(thisloc);
      if (nextpt !== null) this.addPoint(nextpt);
      prevloc = thisloc;
    }

    // fix up the end points when it's Bezier
    if (this.curve === go.Link.Bezier) {
      // fix up the first point and the first control point
      var start = this.getLinkPointFromPoint(this.fromNode, this.fromPort, this.fromPort.getDocumentPoint(go.Spot.Center), this.getPoint(3), true);
      var ctrl2 = this.getPoint(2);
      this.setPoint(0, start);
      this.setPoint(1, new go.Point((start.x * 3 + ctrl2.x) / 4, (start.y * 3 + ctrl2.y) / 4));
      // fix up the last point and the last control point
      var end = this.getLinkPointFromPoint(this.toNode, this.toPort, this.toPort.getDocumentPoint(go.Spot.Center), this.getPoint(this.pointsCount - 4), false);
      var ctrl1 = this.getPoint(this.pointsCount - 3);
      this.setPoint(this.pointsCount - 2, new go.Point((end.x * 3 + ctrl1.x) / 4, (end.y * 3 + ctrl1.y) / 4));
      this.setPoint(this.pointsCount - 1, end);
    }

    return true;
  };
  // end MultiNodePathLink class













  myDiagram.linkTemplateMap.add('BEZIER',
    $(MultiNodePathLink, // slightly curved, by default
      go.Link.Bezier,
      new go.Binding("points").makeTwoWay(),
      new go.Binding("zOrder"),
      // remember the Link.routing too
      new go.Binding("routing", "routing", go.Binding.parseEnum(go.Link, go.Link.AvoidsNodes))
        .makeTwoWay(go.Binding.toString),

  //    $(go.Shape, { isPanelMain: true, stroke: "transparent", strokeWidth: 10 }),

      $(go.Shape,  // the link's path shape
        { isPanelMain: true, stroke: "transparent", strokeWidth: 8 },
        new go.Binding("pathPattern", "patt", convertPathPatternToShape )
      ),
      
      $(go.Shape,  // the "to" arrowhead
        { scale: 2  },
        new go.Binding("toArrow"),
        new go.Binding("stroke", 'color'),
        new go.Binding("fill", 'color')
        ),
      {
        mouseEnter: function(e, link) { link.elt(0).stroke = "rgba(0,90,156,0.3)"; updateCtrlColor(myDiagram.findNodeForKey(link.data.key-3), 'rgba(250,0,0,0.5)'); },
        mouseLeave: function(e, link) { link.elt(0).stroke = "transparent";  updateCtrlColor(myDiagram.findNodeForKey(link.data.key-3), 'transparent');},
        selectionChanged: function(part) {
          if( part.isSelected )
          {
            document.getElementById("ch_head").disabled = false;
            if( part.data.toArrow === "Standard" )
              document.getElementById("ch_head").checked = true;
            else
              document.getElementById("ch_head").checked = false;
          }
          else{
            document.getElementById("ch_head").disabled = true;
          }
        }
        // click: function(e, link) {
        //   var connected_nodes = new go.List();
        //   connected_nodes.add(myDiagram.findNodeForKey(link.data.key-3));
        //   connected_nodes.add(myDiagram.findNodeForKey(link.data.key-2));
        //   connected_nodes.add(myDiagram.findNodeForKey(link.data.key-1));
        //   connected_nodes.add(link);
          
        //   myDiagram.selectCollection(connected_nodes);
        // }
      }                    
    ));

    myDiagram.linkTemplateMap.add('NORMAL',
    $(MultiNodePathLink, // slightly curved, by default
      new go.Binding("points").makeTwoWay(),
      new go.Binding("zOrder"),
      // remember the Link.routing too
      new go.Binding("routing", "routing", go.Binding.parseEnum(go.Link, go.Link.AvoidsNodes))
        .makeTwoWay(go.Binding.toString),

  //    $(go.Shape, { isPanelMain: true, stroke: "transparent", strokeWidth: 10 }),

      $(go.Shape,  // the link's path shape
      { isPanelMain: true, stroke: "transparent", strokeWidth: 8 },
        new go.Binding("pathPattern", "patt", convertPathPatternToShape ) ),
      
      $(go.Shape,  // the "to" arrowhead
        { scale: 2  },
        new go.Binding("toArrow"),
        new go.Binding("stroke", 'color'),
        new go.Binding("fill", 'color') ),
      {
        mouseEnter: function(e, link) { link.elt(0).stroke = "rgba(0,90,156,0.3)"; updateCtrlColor(myDiagram.findNodeForKey(link.data.key-3), 'rgba(250,0,0,0.5)'); },
        mouseLeave: function(e, link) { link.elt(0).stroke = "transparent";  updateCtrlColor(myDiagram.findNodeForKey(link.data.key-3), 'transparent');},
        selectionChanged: function(part) {
          if( part.isSelected )
          {
            document.getElementById("ch_head").disabled = false;
            if( part.data.toArrow === "Standard" )
              document.getElementById("ch_head").checked = true;
            else
              document.getElementById("ch_head").checked = false;
          }
          else{
            document.getElementById("ch_head").disabled = true;
          }
        },
        // mouseDrop: function (e, part) {
        //   var connected_nodes = new go.List();
        //   connected_nodes.add(myDiagram.findNodeForKey(part.data.key-3));
        //   connected_nodes.add(myDiagram.findNodeForKey(part.data.key-2));
        //   connected_nodes.add(myDiagram.findNodeForKey(part.data.key-1));
        //   connected_nodes.add(part);
        //   myDiagram.selectCollection(connected_nodes);
  
        // }

        // click: function(e, link) {
        //   var connected_nodes = new go.List();
        //   connected_nodes.add(myDiagram.findNodeForKey(link.data.key-3));
        //   connected_nodes.add(myDiagram.findNodeForKey(link.data.key-2));
        //   connected_nodes.add(myDiagram.findNodeForKey(link.data.key-1));
        //   connected_nodes.add(link);
          
        //   myDiagram.selectCollection(connected_nodes);
        // }
      }                    
    ));


}
// Show the diagram's model in JSON format that the user may edit
function save() {
  saveDiagramProperties();  // do this first, before writing to JSON
  var diagram_data = myDiagram.model.toJson();
  diagram_data = diagram_data.substr(0, diagram_data.length-1)+', "bg_num":' + current_back + '}';
  document.getElementById("mySavedModel").value = diagram_data;
  myDiagram.isModified = false;
}

function  myCallback(img)
{
  var img_div = document.getElementById('img_div');
  img_div.innerHTML = '';
  img_div.appendChild(img);
}
function save_png()
{
  var cmd = myDiagram.commandHandler;
  go.CommandHandler.prototype.stopCommand.call(cmd);

  var img = myDiagram.makeImage({
    size: new go.Size(Infinity, Infinity),
    scale: 1,
    type: "image/png"
  });
  // var newWindow = window.open("", "newWindow");
  //       if (!newWindow) return;
  //       var newDocument = newWindow.document;
  //       var png = myDiagram.makeImage({
  //           size: new go.Size(Infinity, Infinity),
  //           scale: 1,
  //           type: "image/png"
  //       });
  //       newDocument.body.appendChild(png);
  var img_div = document.getElementById('img_div');
  img_div.innerHTML = '';
  img_div.appendChild(img);    
  // var img = myDiagram.makeImage(
  //   {scale:1,  callback: myCallback}
  // );
}
function load() {
  myDiagram.clear();
  var tot_array = JSON.parse(document.getElementById("mySavedModel").value);
  if( tot_array === null )
    return;

  var ImageNumber = tot_array.bg_num;
  myDiagram.add(
    $(go.Node,
        { layerName: "Background", position: new go.Point(0, 0), selectable: false, pickable: false },
        $(go.Picture, "images/Soccer/playground" + ImageNumber + '.jpg', { width: canvas_width, height: canvas_height, imageStretch: go.GraphObject.Uniform}) ));
  
  var node_array = tot_array.nodeDataArray;
  if(node_array === null )
    return;
  var i = 0;
  for( i = 0 ; i < node_array.length ; i ++ )
  {
    myDiagram.model.addNodeData(node_array[i]);
  }

  var link_array = tot_array.linkDataArray;
  if(link_array === null )
    return;
  for(i = 0 ; i < link_array.length; i ++ )
  {
    myDiagram.model.addLinkData(link_array[i]);
  }
  loadDiagramProperties();
  myDiagram.isModified = false;
}

function refresh()
{
  var bOK = confirm("This will clear all data. Are you certain?");
  if( !bOK )
    return;
  node_cnt = 0;
  myDiagram.clear();
  myDiagram.add(
    $(go.Part,
        { layerName: "Background", position: new go.Point(0, 0), selectable: false, pickable: false },
        $(go.Picture, "images/Soccer/playground" + current_back + '.jpg', { width: canvas_width, height: canvas_height, imageStretch: go.GraphObject.Uniform})));
}

function undo()
{
	myDiagram.undoManager.undo();
}

function redo()
{
	myDiagram.undoManager.redo();
}

function delete_()
{
  myDiagram.startTransaction();
  myDiagram.selection.each(function (part) {
    if( part.data.category === 'contrPoint' )
    {
      var nCnt = 0;
      var bFirstPt = false;
      part.findNodesConnected().each(function(n) {
        if( n.data.key > part.data.key )
          bFirstPt = true;
        nCnt++;
        myDiagram.remove(n);  
      });

      //this is middle part
      if( nCnt == 0 )
      {
        myDiagram.remove(myDiagram.findNodeForKey(part.data.key - 1));
        myDiagram.remove(myDiagram.findNodeForKey(part.data.key + 1));
      }
      else
      {
        if(bFirstPt)
          myDiagram.remove(myDiagram.findNodeForKey(part.data.key + 1));
        else
          myDiagram.remove(myDiagram.findNodeForKey(part.data.key - 1));
      }
    }
    myDiagram.remove(part);
  });
  myDiagram.commitTransaction("deleted node");
}

function saveDiagramProperties() {
  myDiagram.model.modelData.position = go.Point.stringify(myDiagram.position);
}

function loadDiagramProperties(e) {
  var pos = myDiagram.model.modelData.position;
  if (pos)
   myDiagram.initialPosition = go.Point.parse(pos);
}

document.addEventListener('DOMContentLoaded', (event) => {
    init();
})

//add Equipment
function addEqupment(source_name, z_order) {
	myDiagram.commit(function() {
    var img = new Image();
    img.addEventListener("load", function(){
      var model = myDiagram.model;
      var bArear = false;
      if( z_order === 0 )
        bArear = true;

      model.addNodeData({category: 'Equipment', isArea: bArear, zOrder: z_order, key: node_cnt, source_img: 'images/Soccer/' + source_name + ".png",   loc: "420 403", size: this.naturalWidth / 2 + " " + this.naturalHeight / 2 });
      node_cnt++;
    });
    img.src = 'images/Soccer/' + source_name + ".png";
    node_cnt++;
	});
}

//add Link
function addLink(link_type, source_name) {
	myDiagram.commit(function() {
		var model = myDiagram.model;
    model.addNodeData({zOrder: 2, category: 'contrPoint', key: node_cnt,    loc: "420 403", color: 'transparent'});
    model.addNodeData({zOrder: 2, category: 'contrPoint', key: node_cnt+1,  loc: "645 403", color: 'transparent'});
    model.addNodeData({zOrder: 2, category: 'contrPoint', key: node_cnt+2,  loc: "870 403", color: 'transparent'});
    myDiagram.model.addLinkData({"category":link_type, "patt":source_name, "patt2":"", "toArrow":"Standard", from: node_cnt, to: node_cnt+2, path: [node_cnt+1], key: node_cnt+3, color: 'black', zOrder: 1});
    node_cnt += 4;
	});
}


//add Player
function addPlayer(txt_name, img_src){
	myDiagram.commit(function() {
		var model = myDiagram.model;
    model.addNodeData({zOrder: 1, category: 'player', key: node_cnt, size:'50 50', loc: "420 420", back_img: img_src, text_name: txt_name, text_number: '', text_color: 'red'});
    node_cnt ++;
	});
}

function addPlayer1(txt_name, img_src){
	myDiagram.commit(function() {
		var model = myDiagram.model;
    model.addNodeData({zOrder: 1, category: 'player1', key: node_cnt, size:'50 50', loc: "420 420", back_img: img_src, text_number: ''});
    node_cnt ++;
	});
}


//update Background
function updateBackgroundImage(ImageNumber) {       
  if( ImageNumber == current_back )
    return;
    
  var bOK = confirm("This will clear all data. Are you certain?");
  if( !bOK )
    return;
  current_back = ImageNumber;    
  node_cnt = 0;
  myDiagram.clear();
  myDiagram.add(
      $(go.Node,
          { layerName: "Background", position: new go.Point(0, 0), selectable: false, pickable: false },
          $(go.Picture, "images/Soccer/playground" + ImageNumber + '.jpg', { width: canvas_width, height: canvas_height, imageStretch: go.GraphObject.Uniform}) ));
  myDiagram.isModified = false;
}

function changeColor(color, nIdx)
{
  myDiagram.selection.each(function (part) {
    if (part instanceof go.Node) {
      
      //change player color
      if( part.data.category === 'player' || part.data.category === 'player1' )
      {
        myDiagram.model.setDataProperty(part.data, "text_color", color);
        var bg_path = part.data.back_img;
        if( bg_path !== '' )
        {
          var img = new Image();
          img.addEventListener("load", function(){
            bg_path = bg_path.substr(0, bg_path.indexOf('.png') - 1) + nIdx + '.png' ;
            myDiagram.model.setDataProperty(part.data, "back_img", bg_path);
          });
          img.src = bg_path;
        }
      }

      //change equipment color
      if( part.data.category === 'Equipment' )
      {
        var bg_path = part.data.source_img;
        bg_path = bg_path.substr(0, bg_path.indexOf('.png') - 1) + nIdx + '.png' ;
        if( bg_path !== '' )
        {
          var img = new Image();
          img.addEventListener("load", function(){
            myDiagram.model.setDataProperty(part.data, "source_img", bg_path);
          });
          img.src = bg_path;
        }
  
      }
    }

    if (part instanceof MultiNodePathLink) {
      myDiagram.model.setDataProperty(part.data, "color", color);
      var path_type = part.data.patt;
      path_type = path_type.substr(0, path_type.length - 1) + nIdx;
      myDiagram.model.setDataProperty(part.data, "patt", path_type);

      // //changeLinkColor
      // myDiagram.startTransaction("changeLinkColor");
      // var it = part.iterator;
      // while (it.next()) {
      //   var item = it.value;
      //   var path = $(go.Shape,
      //               {
      //                 geometryString: "M0 4 L2 0 6 8 8 4",
      //                 stroke: "black",
      //                 strokeWidth: 2
      //               }
      //             );
      //   item.elt(0).pathPattern = path;
      // }
      // myDiagram.commitTransaction("changeLinkColor");
    
    }
    }); 
}

function changePlayerNumber(strNumber){
  myDiagram.selection.each(function (part) {
    if (part instanceof go.Node) {
      if( part.data.category === 'player' || part.data.category === 'player1')
      {
        myDiagram.model.setDataProperty(part.data, "text_number", strNumber);
      }
      console.log(part.data);
    }
    }); 
}

function changeArrowHeader(){
  var isChecked = document.getElementById("ch_head").checked;
  var arrowHead = '';
  if( isChecked )
    arrowHead = 'Standard';

  myDiagram.selection.each(function (part) {
    if (part instanceof MultiNodePathLink) {
      myDiagram.model.setDataProperty(part.data, "toArrow", arrowHead);
    }
  });
}


function updateCtrlColor(part, color)
{
  var nodes = [];
  var nCnt = 0;
  var bFirstPt = false;
  part.findNodesConnected().each(function(n) {
    if( n.data.key > part.data.key )
      bFirstPt = true;
    nCnt++;
    nodes.push(n);
//    myDiagram.model.setDataProperty(n.data, "color", color); 
  });

  //this is middle part
  if( nCnt == 0 )
  {
    nodes.push(myDiagram.findNodeForKey(part.data.key - 1));
    nodes.push(myDiagram.findNodeForKey(part.data.key + 1));

    // myDiagram.model.setDataProperty(myDiagram.findNodeForKey(part.data.key - 1).data, "color", color); 
    // myDiagram.model.setDataProperty(myDiagram.findNodeForKey(part.data.key + 1).data, "color", color); 
  }
  else
  {
    if(bFirstPt)
      nodes.push(myDiagram.findNodeForKey(part.data.key + 1));
//      myDiagram.model.setDataProperty(myDiagram.findNodeForKey(part.data.key + 1).data, "color", color); 
    else
      nodes.push(myDiagram.findNodeForKey(part.data.key - 1));
//        myDiagram.model.setDataProperty(myDiagram.findNodeForKey(part.data.key - 1).data, "color", color); 
  }
  nodes.push(part);

  var bSel = false;
  for(var i = 0 ; i < nodes.length ; i ++ )
  {
    if( nodes[i] instanceof go.Node )
    {
      if( nodes[i].isSelected )
      bSel = true;
    }
  }

  if( bSel )
    color = 'rgba(250,0,0,0.5)';
  for(var i = 0 ; i < nodes.length ; i ++ )
  {
    if( nodes[i] instanceof go.Node )
    {
      myDiagram.model.setDataProperty(nodes[i].data, "color", color); 
    }
  }
}