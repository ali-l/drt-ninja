// Make object namespace
window.routeMap = {};

// Initialize map
routeMap.init = function(lat, lon, cor) {
  
  // Get variables from data attributes on DOM element
  var latitude = lat;
  var longitude = lon;
  var coords = cor;

  // Set map options
  var options = {
    zoom: 12,
    center: new google.maps.LatLng(latitude, longitude),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  }

  // Render map
  this.canvas = new google.maps.Map($('#map-canvas')[0], options);

  // Add user's position
  this.addMarker(latitude, longitude, "http://maps.google.com/mapfiles/ms/icons/red-dot.png", "You are here!")


  // Plot points on map
  if (coords) {
    var _this = this;
    coords.forEach(function(coord) {
      _this.addMarker(coord.latitude, coord.longitude, "http://maps.google.com/mapfiles/ms/icons/green-dot.png", coord.text);
    });
  }
};

// Make marker for coordinates
routeMap.addMarker = function(latitude, longitude, image, text) {
  var marker = new google.maps.Marker({
    position: new google.maps.LatLng(latitude, longitude),
    map: this.canvas,
    icon: image,
    title: text
  });
}

// After document has loaded
$(document).ready(function() {
	
	// Declare variables
	var currentSchedule;
	var stopValue = null;

	// Log item to console
	function debug(data) {
		console.log(data);
	}

	// Make object of bus stop coordinates for bus route
	function makeCoords(schedule, names) {
		locations = [];
		for (var i = 0; i < schedule.length; i ++) {
			locations.push({
				latitude: schedule[i].latitude,
				longitude: schedule[i].longitude,
				text: names[i]
			});
		}
		return locations;
	}

	// Get schedule based on route and day selection in DOM and render template
	function getSchedule() {

		// Weekday/weekend schedule
		var day = "?day=" + $(".days input:checked").attr("value");

		// Save href of clicked link
		var href = "/busses/" + $(".bus-route option:selected").attr("value") + day;

		// Ajax request for schedule JSON of clicked route
		$.ajax({
			url: href,
			type: 'GET',
			dataType: 'json'
		}).done(function(data) {
			
			// After getting response
			var template;

			// Template source on index view
			var source = $("#bus-stops-template").html();

			// If data was received (data is JSON object for bus route)
			if (data) {

				// Store schedule
				currentSchedule = data;

				// Create object to send to template
				var context = { stopNames: [] }
				for (var i = 0; i < currentSchedule.length; i++) {
					context.stopNames[i] = {
						shortName: currentSchedule[i].name.slice(17),
						fullName: currentSchedule[i].name,
						order: i + 1
					}
				}

				// Compile and render bus stops template
				template = Handlebars.compile(source);
				var html    = template(context);
				$("#bus-stops").html(html);

				// If stop was previously saved
				if (stopValue != null) {
					
					// Select the bus stop previously selected
					$(".bus-stop").val(stopValue).change();

					// Reset stopValue
					stopValue = null;
				}

				// Make stop names for map
				var names = [];
				for (var i = 0; i < currentSchedule.length; i++) {
					names[i] = currentSchedule[i].name.slice(17);
				}

				// Render google map
				routeMap.init(routeMap.location[0], routeMap.location[1], makeCoords(currentSchedule, names));
			}
		});
	}

	// Geolocate
	navigator.geolocation.getCurrentPosition(function(position) {
		routeMap.location = [position.coords.latitude, position.coords.longitude];
		//routeMap.location = [43.837963, -79.087224];
		console.log('Location obtained!')
		// Send coordinates and get nearby stops
		$.ajax({
			url: '/busses/?lat=' + routeMap.location[0] + '&lon=' + routeMap.location[1],
			type: 'GET',
			dataType: 'json'
		}).done(function(data) {
	
			// If data was received
			if (data) {

				// Log data to console
				debug(data);

				// Assign to variable
				nearbyStops = data;

				// Make handlebars template
				var template;
				// Template source on index view
				var source = $("#nearby-stops-template").html();
				// Convert time format
				
				// Format times when present
				nearbyStops.forEach(function(stop) {
						formattedTime = moment(stop.time).format('h:mm a') + " - " + moment(stop.time).fromNow();
						stop.time = formattedTime;
						name = "value=\'" + stop.route + "\']";
						stop.route = $(".bus-route>option[" + name).text();
						stop.stop.name = stop.stop.name.slice(17);
				});

				
				// Create object to send to template
				var context = { nearby: nearbyStops }
				// Compile and render bus stops template
				template = Handlebars.compile(source);
				var html = template(context);
				$("#nearby-stops").html(html);

				// Render google map
				routeMap.init(routeMap.location[0], routeMap.location[1]);
				
			} else {
				
				// Notify the user
				$("#nearby-stops-template").html("<h3>Nothing Near You</h3>");
			}
				
		});
	});

	// Animate heading

	$("#animation-container h1").toggleClass("animated flip");

	// When bus route is changed
	$(".bus-route").on("change", function() {
		
		// Hide stop times if showing
		$("#stop-times").html("");

		// Check for no option selected
		if ($(".bus-route option:selected").attr("value") != 0) {
			getSchedule();	
		}
	});

	// When day is changed
	$(".days").on("change", function() {

		// If bus stop already selected
		if ($(".bus-stop option:selected").attr("value") != 0) {
			// Save stop
			stopValue = $(".bus-stop option:selected").attr("value");
		}

		// Check for no bus route selected
		if ($(".bus-route option:selected").attr("value") != 0) {
			getSchedule();	
		}
	});

	// When bus stop is changed
	$("#bus-stops").on("change", ".bus-stop" , function() {
		// Get the name of selected stop
		var stopOrder = $(".bus-stop option:selected").attr("value") - 1;
		
		// Get the timings for the stop
		var stopTimes = currentSchedule[stopOrder].times;

		// Build template
		var template;

		// Template source on index view
		var source = $("#stop-times-template").html();

		// Create object to send to template
		var context = { stopTime: stopTimes }
		template = Handlebars.compile(source);
		var html    = template(context);
		$("#stop-times").html(html);
	});
});
