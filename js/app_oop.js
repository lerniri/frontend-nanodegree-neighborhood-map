
var WikiAPI = function() {

	this.endpoint = "http://en.wikipedia.org/w/api.php?";
	this.result = [];

};

/* search wiki pages based on specified word pattern
 * returns array
 *      title, link, snippet
 */
WikiAPI.prototype.searchWikiPages = function(searchStr) {

	var url = this.endpoint+"format=json&action=query&list=search&srsearch="+searchStr+"&srlimit=5&callback=?";

	//make ajax call and return a result
	var result = [];

	$.ajax({
    	url: url,
    	dataType: 'jsonp',
    	success: function(data) {
    		for (var i = 0; i < data.query.search.length; i++) {
	       		result.push({
	        		title 	: data.query.search[i].title,
	        		link 	: constructWikiLink(data.query.search[i].title),
	        		snippet	: data.query.search[i].snippet
	        	});
			}

    	},
    	error: function() {
    		//TODO: implement error handling
    	}

	});


	//construct wiki link
	function constructWikiLink(title) {
	 		return "http://en.wikipedia.org/wiki/"+title;
	}

};



/* ============================================
 *  			Flickr Api  Object
/* ============================================ */
var FlickrAPI = function() {
	var endpoint = 'https://api.flickr.com/services';
}



var MapViewModel = function() {

	/* VARIABLES */

	var self = this;
	var map,  				// google map object
		placesService,      // google places service object
		infoWindow;			// google info window object


    var wiki = new WikiAPI();


	var bikeLayer,			// google bike layer object
		trafficLayer,		// google traffic layer object
		transitLayer; 		// google transit layer object

	var placesTypes = [		// google places  types list
		'bakery',
		'bar',
		'cafe',
		'food',
		'movie_theater',
		'museum',
		'park',
		'night_club',
		'restaurant',
		'shopping_mall',
		'zoo'
	];

	var defaultNeighborhood = "Tushino";	// default neighborhood
	var nearbyMarkers	= [];				// array with nearby places markers


	var GMAPS_PLACESSERVICE_STATUS_OK = google.maps.places.PlacesServiceStatus.OK;
	var GMAPS_PLACESSERVICE_STATUS_OVER_QUERY_LIMIT = google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT;


	/* 	OBSERVABLES  */

	self.myNeighborhood 		= ko.observable( defaultNeighborhood ); // current neighborhood
	self.nearbyPlaces 			= ko.observableArray();					// list of nearby places
	self.keywordSearch			= ko.observable("");					// search keyword
	self.neighborhoodImages 	= ko.observableArray([]);				// list of neighborhood images

	self.bikeLayerEnabled 		= ko.observable(false);					// boolean value, indicating whether bike layer is currently enabled or disabled
	self.trafficLayerEnabled 	= ko.observable(false);					// boolean value, indicating whether traffic layer is currently enabled or disabled
	self.transitLayerEnabled 	= ko.observable(false);					// boolean value, indicating whether transit layer is currently enabled or disabled

	self.instagramEnabled		= ko.observable(false);					// boolean value, indicating whether instagram view is currently enabled or disabled
	self.placeInfoEnabled		= ko.observable(false);					// boolean value, indicating whether placeInfo view is currently enabled or disabled
	self.newsFeedEnabled		= ko.observable(false);					// boolean value, indicating whether newsFeed view is currently enabled or disabled

	self.placeInfoPages 		= ko.observableArray([]);				// list of wiki pages found for neighborhood

	self.showAddInfoWindow 		= ko.observable(false);

	self.loading 				= ko.observable(false);
	self.addInfoLoading 		= ko.observable(false);

	self.toggleBikeLayer = function() {
		self.bikeLayerEnabled( !self.bikeLayerEnabled() );
		showHideLayers();
	};

	self.toggleTrafficLayer = function() {
		self.trafficLayerEnabled( !self.trafficLayerEnabled() );
		showHideLayers();
	};

	self.toggleTransitLayer = function() {
		self.transitLayerEnabled( !self.transitLayerEnabled() );
		showHideLayers();
	};

	self.toggleInstagram = function() {

		self.instagramEnabled( !self.instagramEnabled() );

		// // hide wiki and news
		if ( self.instagramEnabled() ) {

			self.placeInfoEnabled(false);
			self.newsFeedEnabled(false);
		}

		// showHideAdditionalInfoWindow();
		loadInstagramMedia();
	};

	self.toggleWiki = function() {
		self.placeInfoEnabled( !self.placeInfoEnabled() );

		// hide instagram and news
		if ( self.placeInfoEnabled() ) {

			self.instagramEnabled(false);
			self.newsFeedEnabled(false);
		}


		//showHideAdditionalInfoWindow();
		loadWikipediaInfo();

	};

	self.toggleNews = function() {
		self.newsFeedEnabled( !self.newsFeedEnabled() );

		// hide insta and wiki
		if ( self.newsFeedEnabled() ) {
			self.placeInfoEnabled(false);
			self.instagramEnabled(false);
		}

		showHideAdditionalInfoWindow();
		loadNewsBBC();
	};

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


	self.resetSearchFilter = function() {
		self.keywordSearch("");
		requestNeighborhood();
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
			self.placeInfoPages([]);
			self.neighborhoodImages([]);
			requestNeighborhood();
		}

	});


	self.computedKeywordSearch	= ko.computed(function() {

		if (self.keywordSearch() !== "") {
			requestNearbyPlacesKeyword();
		}

	});

	self.computedShowAddInfo	= ko.computed(function() {
		var $addinfo = $(".addinfo-content");
		if ( self.instagramEnabled() || self.placeInfoEnabled() ) {
			self.showAddInfoWindow(true);
			$addinfo.addClass('show-addinfo');
		} else if ( !self.instagramEnabled() && !self.placeInfoEnabled()) {
			self.showAddInfoWindow(false);
			$addinfo.removeClass('show-addinfo');
		}
	});


	// initialize map
	function initMap() {
 		var mapOptions = {
 			zoom:14,
			mapTypeControl:false,
			scaleControl:true,
			streetViewControl:true,
			overviewMapControl:true,
			rotateControl:true
  		};

  		map 			= new google.maps.Map(document.querySelector('#map'), mapOptions);
  		infoWindow		= new google.maps.InfoWindow();
  		placesService 	= new google.maps.places.PlacesService(map);

  		/*
  			Init  Layers
  		*/
  		bikeLayer 	 = new google.maps.BicyclingLayer();
  		trafficLayer = new google.maps.TrafficLayer();
  		transitLayer = new google.maps.TransitLayer();


  		google.maps.event.addDomListener(window, "resize", function() {
     		var center = map.getCenter();
     		google.maps.event.trigger(map, "resize");
     		map.setCenter(center);
    	});

	}

	/* requestNeighborhood() function:
	 *
	 *	Search neighborhood map data
	 */
	function requestNeighborhood() {
		var request = {
    		query: self.myNeighborhood()
  		};

  		placesService.textSearch(request, loadNeighborhood);
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

			//load photos
			var myKey = "AIzaSyCV9N5j38lkbSHp46-pYU5Wh01ijgSwq4w";

			var url = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference="+place.reference+"sensor=true&key="+myKey;

			console.log(url);
			$.ajax({
				url : url,
				dataType: 'jsonp',
				success: function(data) {
					console.log(data);
				}

			})

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
			types:placesTypes
		}

		// service = new google.maps.places.PlacesService(map);
  		// service.search(request, requestNearbyPlacesCallback);
		placesService.nearbySearch(request, loadNearbyPlaces);

	}

	/*
		Text Search for nearby places
	*/
	function requestNearbyPlacesKeyword() {

		var request = {
			location: map.getCenter(),
			radius: 1000,
			query: self.keywordSearch()
		}

		placesService.textSearch(request, loadNearbyPlaces);


	};

	/*
		Load returned places to the list of places and load respective markers on the map
	*/

	function loadNearbyPlaces(results, status, pagination) {

		if (status === GMAPS_PLACESSERVICE_STATUS_OK) {
			//Load places list
			self.nearbyPlaces([]);
			clearMarkers();

			// var service = new google.maps.places.PlacesService(map);
			// recursive function (a work around for request limit)
			var process_result = function (result, i) {

				// self.loading(true);

				if (i >= result.length){
					self.loading(false);
					return;

				}

				var request = {
					placeId: result[i].place_id
			    };
			      
			 	placesService.getDetails(request, function(place, status) {
				if (status === GMAPS_PLACESSERVICE_STATUS_OK)   {
					/*
						do something
					*/

					//create mearby place
					self.nearbyPlaces.push({
						"name"		: place.name,
						"icon"		: place.icon,
						"address"	: place.formatted_address,
						"phone" 	: place.formatted_phone_number,
						"types"		: place.types,
						"rating"	: place.user_ratings_total,
						"website"	: place.website,
						"reviews"	: place.reviews,
						"photos"	: place.photos
					});



					nearbyMarkers.push(new google.maps.Marker({
						position	: place.geometry.location,
						name 		: place.name,
						address 	: place.formatted_address,
						phone 		: place.formatted_phone_number

						//add more options used by info window
					}));

					setMarker(nearbyMarkers[i], place);


					// Load markers
					// TODO:  create an object to work with markers


					// increment 'i'
					process_result(result, i+1);

				} else if (status === GMAPS_PLACESSERVICE_STATUS_OVER_QUERY_LIMIT) {

						// wait 200ms, then try again with same 'i'
						window.setTimeout(function (){
							process_result(result, i);
						}, 200);
			 	}
			}); // process_result() function end

		}

			process_result(results, 0);

		} else {

			// TODO: add message for the user
			// Do that in self.nearbyPlaces ???
			console.log("failed to load places");

		}

	} // loadNearbyPlaces() END


	/*
		Search places callback function - checks search status
		and runs loadNearbyPlacesOnMap function if status is OK

		TODO: unify results search callback function
	*/

	function requestNearbyPlacesCallback(results, status) {
		if ( status === GMAPS_PLACESSERVICE_STATUS_OK ) {
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
        	infoWindow.setContent( "<div id='infowindow-div' class='noscroll'><h6>" + marker.name + "</h6><p>" + marker.address + "</p><span>"+ marker.phone +"</span></div>" );
        	infoWindow.open(map, this);
        	map.panTo(marker.position);
      	});

	}

	/*
		Apply markers on the map

	*/
	function setMarkers() {
  		for (var i = 0; i < nearbyMarkers.length; i++) {
    		nearbyMarkers[i].setMap(map);
  		}
	}

	/*
		Clear markers from the map

	*/
	function clearMarkers() {
		for (var i = 0; i < nearbyMarkers.length; i++) {
    		nearbyMarkers[i].setMap(null);
  		}
  		nearbyMarkers = [];
	}


	/*
		Additional Info Window (Show/Hide)

	*/

	function showHideAdditionalInfoWindow() {


		var $addinfo = $('.addinfo-content');
		if ( self.instagramEnabled() || self.placeInfoEnabled() || self.newsFeedEnabled() ) {
			$addinfo.addClass('show-addinfo');
		} else if  ( !self.instagramEnabled() && !self.placeInfoEnabled() && !self.newsFeedEnabled() ) {
			$addinfo.removeClass('show-addinfo');
		}
	}


	/*
		Show/Hide Layers
	*/

	function showHideLayers() {

		//bike layer
		if (self.bikeLayerEnabled()) {
			// show bike layer
			bikeLayer.setMap(map);
		} else {
			// hide bike layer
			bikeLayer.setMap(null);
		};

		//transit layer
		if (self.transitLayerEnabled()) {
			//show layer
			transitLayer.setMap(map);
		} else {
			//hide layer
			transitLayer.setMap(null);
		};

		//traffic layer
		if (self.trafficLayerEnabled()) {
			//show
			trafficLayer.setMap(map);
		} else {
			//hide
			trafficLayer.setMap(null);
		};
	};


	/*
		Load Instagram Media

	*/

	// TODO: Incapsulate to an object
	function loadInstagramMedia() {

		// quit function in case instagram  window is closing
		if ( !self.instagramEnabled() || self.neighborhoodImages().length > 0 ) {

			//TODO: think of utilizing local storage to save loaded pics
			return;

		};

		var access_token = '36229642.37a7c6f.21f4b44989b94872b6116fe8eeededf8';
		var lat = map.getCenter().lat();
		var lng = map.getCenter().lng();

		var url = "https://api.instagram.com/v1/media/search?lat="+lat+"&lng="+lng+"&access_token="+access_token;

		self.addInfoLoading(true);

		// make ajax call to Instagram media endpoint
		$.ajax({
			url: url,
			dataType: 'jsonp',
			success: function(result) {

				if (result.meta.code === 200) {
					//construct neighborhoodImages object
					for ( i=0; i < result.data.length; i++ ) {

						//TODO think of filtering images via request link

						if ( result.data[i].type === 'image' ) {

							self.neighborhoodImages.push({

								author			: result.data[i].user.username,
								name 			: result.data[i].location.name,
								thumb_img		: result.data[i].images.thumbnail.url,
								thumb_img_h		: result.data[i].images.thumbnail.height,
								thumb_img_w		: result.data[i].images.thumbnail.width,
								full_img		: result.data[i].images.standard_resolution.url,
								full_img_h		: result.data[i].images.standard_resolution.height,
								full_img_w		: result.data[i].images.standard_resolution.width
							})
						}
					}

					self.addInfoLoading(false);

				} else {
					//TODO: error handler
				}

			}
		})
	} // function loadInstagramMedia()


	function loadWikipediaInfo() {

		if ( !self.placeInfoEnabled() || self.placeInfoPages().length > 0 ) {
			//TODO: think of utilizing local storage for loaded pics
			return;
		};

		self.placeInfoPages( wiki.searchWikiPages( self.myNeighborhood() ) );

		console.log( self.placeInfoPages() )


	} //function loadWikipediaInfo()


};



ko.applyBindings(new MapViewModel());


