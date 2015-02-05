var MapViewModel = function() {

	var self = this;
	var map;
	var defaultNeighborhood = "Tyshino";
	var nearbyMarkers	= [];
	var infoWindow;

	var GMAPS_PLACESSERVICE_STATUS_OK = google.maps.places.PlacesServiceStatus.OK;


	// OBSERVABLES
	self.myNeighborhood = ko.observable(defaultNeighborhood);
	self.nearbyPlaces 	= ko.observableArray();

	// UI Events
	self.panMapToClickedPlace = function() {
		for (i=0; i<nearbyMarkers.length; i++) {
			if (nearbyMarkers[i].name === this.name) {
				//pan map to marker
				map.panTo(nearbyMarkers[i].position);
				new google.maps.event.trigger( nearbyMarkers[i], 'click' );

			}
		}
	}

	/*
		initialize map
	*/
	initMap();


	// COMPUTED OBSERVABLES
	/*
		load neighborhood on the map depending on the chosen neighborhood
	*/

	self.computedNeighborhood = ko.computed(function() {

		if (self.myNeighborhood() !== '') {
			requestNeighborhood();
		}
	});


	// FUNCTIONS

	// initialize map
	function initMap() {
 		var mapOptions = {
 			zoom:14,
			mapTypeControl:false,
			scaleControl:true,
			streetViewControl:true,
			overviewMapControl:true,
			rotateControl:true
    		// disableDefaultUI: true
  		};
  		map = new google.maps.Map(document.querySelector('#map'), mapOptions);
  		infoWindow	= new google.maps.InfoWindow();
	}

	/* requestNeighborhood() function:
	*
	*	Search neighborhood map data
	*/
	function requestNeighborhood() {
		var request = {
    		query: self.myNeighborhood()
  		};

  		service = new google.maps.places.PlacesService(map);
  		service.textSearch(request, loadNeighborhood);
	}


	/*
		load neighborhood on the map , based on parameters returned in places search
	*/

	function loadNeighborhood(results, status) {

		if (status === GMAPS_PLACESSERVICE_STATUS_OK) {

			var place 		= results[0];
			var lat 		= place.geometry.location.lat();
			var lng 		= place.geometry.location.lng();
			// var placeName 	= place.name;

			var myLocation	= new google.maps.LatLng(lat,lng);

			map.setCenter(myLocation);
			//set marker

			//request and load nearby places
			requestNearbyPlaces();

		} else {

			// error handler
		}
	}

	/*
		Request nearby places
	*/
	function requestNearbyPlaces() {
		/*
			find places within 1000  radius from our neighborhood;
			places types: store... TODO: add more, or make that configurable;
		*/
		var request = {
			location: map.getCenter(),
			radius: 1000,
			types: ['store']
		}

		service = new google.maps.places.PlacesService(map);
  		// service.search(request, requestNearbyPlacesCallback);
		service.search(request, loadNearbyPlaces);
	}


	/*
		Load returned places to the list of places and load respective markers on the map
	*/

	function loadNearbyPlaces(results, status) {

		if (status === GMAPS_PLACESSERVICE_STATUS_OK) {
			//Load places list
			self.nearbyPlaces([]);
			clearMarkers();

			var service = new google.maps.places.PlacesService(map);

			//recursive function (a work around for request limit)
			var process_result = function (result, i) {
				if (i >= result.length){
					return;
				}

				var request = {
					placeId: result[i].place_id
			    };
			      
			    service.getDetails(request, function(place, status) {
					if (status === GMAPS_PLACESSERVICE_STATUS_OK)   {
						/*
						do something
						*/

						//create mearby place
						self.nearbyPlaces.push({
							"name":place.name,
							"icon": place.icon,
							"address": place.formatted_address,
							"phone" : place.formatted_phone,
							"types": place.types,
							"rating": place.user_ratings_total,
							"website": place.website,
							"reviews": place.reviews
						});



						nearbyMarkers.push(new google.maps.Marker({
							position:place.geometry.location,
							name: place.name,
							"placeId": place.place_id
							//add more options used by info window
						}));

						setMarker(nearbyMarkers[i], place);


						//Load markers
						// TODO:  create an object to work with markers


						// increment 'i'
						process_result(result, i+1);

					} else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
						// wait 200ms, then try again with same 'i'
						window.setTimeout(function (){
							process_result(result, i);
						}, 100);
			 		}
				}); //process_result() function end

			}

			process_result(results, 0);

		} else {

			//TODO: add message for the user
			// Do that in self.nearbyPlaces ???
			console.log("failed to load places");

		}

		console.log();

	} //loadNearbyPlaces() END


	/*
		Get additional details for particular place id
	*/
	function getPlaceDetails(place_id, service) {

		var request = {
				placeId: place_id
			};


		service.getDetails(request, function(place, status) {

			if (status === GMAPS_PLACESSERVICE_STATUS_OK)	 {

				console.log(place);


			} else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {

				console.log("Limit Error");
			}

		});
	}

	/*
		Search places callback function - checks search status
		and runs loadNearbyPlacesOnMap function if status is OK

		TODO: unify results search callback function
	*/
	function requestNearbyPlacesCallback(results, status) {
		if (status === google.maps.places.PlacesServiceStatus.OK) {
			loadNearbyPlacesOnMap(results);
		}
	}



	/*
		Set marker on the map
		Assign trigger event on click

	*/
	function setMarker(marker, place) {

		marker.setMap(map);

		//add info window  event on marker

		google.maps.event.addListener(marker, 'click', function() {

			// //get place additional information
			// var placeDetails = getPlaceDetails(marker.placeId);
        	infoWindow.setContent( "<div id='infowindow-div' class='noscroll'><h6>" + place.name + "</h6><span>rating: " + (place.rating === undefined ? '-' : + place.rating)  + "</span></div>" );
        	infoWindow.open(map, this);
        	map.panTo(marker.position);
      	});

	}

	/* Apply markers on the map
	*/
	function setMarkers() {
  		for (var i = 0; i < nearbyMarkers.length; i++) {
    		nearbyMarkers[i].setMap(map);
  		}
	}

	/* Clear markers from the map
	*/
	function clearMarkers() {
		for (var i = 0; i < nearbyMarkers.length; i++) {
    		nearbyMarkers[i].setMap(null);
  		}
  		nearbyMarkers = [];
	}


};


ko.applyBindings(new MapViewModel());