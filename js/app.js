var shouter = new ko.subscribable();


var AddInfoViewModel = function() {

	var self = this;

	self.placeInfoEnabled		= ko.observable(false);			// boolean value, indicating whether placeInfo view is currently enabled or disabled
	self.instagramEnabled   	= ko.observable(false);			// boolean value, indicating whether instagram view is currently enabled or disabled
	self.addInfoLoading 		= ko.observable(false);
	self.showAddInfoWindow      = ko.observable(false);

	self.placeInfoEnabled.subscribe(function(newValue) {
		shouter.notifySubscribers(newValue, "placeInfoEnabled");
	});

	self.instagramEnabled.subscribe(function(newValue) {
		shouter.notifySubscribers(newValue, "instagramEnabled");
	});

	self.toggleWiki = function() {
		self.placeInfoEnabled( !self.placeInfoEnabled() );

		// hide instagram and news
		if ( self.placeInfoEnabled() ) {
			self.instagramEnabled(false);
		}
	};


	self.toggleInstagram = function() {

		self.instagramEnabled( !self.instagramEnabled() );
		// // hide wiki and news
		if ( self.instagramEnabled() ) {
			self.placeInfoEnabled(false);
		}
	};

	self.showAddInfoWindow	= ko.computed(function() {
		var $addinfo = $(".addinfo-content");
		if ( self.instagramEnabled() || self.placeInfoEnabled() ) {
			$addinfo.addClass('show-addinfo');
			return true;
		} else if ( !self.instagramEnabled() && !self.placeInfoEnabled()) {
			$addinfo.removeClass('show-addinfo');
			return false;
		}
	});

};


/* ============================================
 *  			Wikipedia View Model
 /* ============================================ */

var WikiViewModel = function() {

	var self = this;

	var endpoint = "http://en.wikipedia.org/w/api.php?";
	var wikiLink = "http://en.wikipedia.org/wiki/" ;

	self.placeInfoPages 		= ko.observableArray([]);
    self.myNeighborhood 		= ko.observable("");
    self.placeInfoEnabled  		= ko.observable(false);

    shouter.subscribe(function(newValue){
    	self.placeInfoEnabled(newValue);
    }, self, "placeInfoEnabled");

    shouter.subscribe(function(newValue) {
        self.myNeighborhood(newValue);
        self.placeInfoPages([]);
    }, self, "neighborhood");


    self.placeInfoEnabledComputed = ko.computed(function(){
    	if (self.placeInfoEnabled()) {
    		searchWikiPages(self.myNeighborhood());
    	}
    });

	function searchWikiPages(searchStr) {

		if ( !self.placeInfoEnabled() || self.placeInfoPages().length > 0 ) {
			return;
		}

		var url = endpoint+"format=json&action=query&list=search&srsearch="+searchStr+"&srlimit=5&callback=?";

		$.ajax({
	    	url: url,
	    	dataType: 'jsonp',
	    	success: function(data) {
	    		for (var i = 0; i < data.query.search.length; i++) {
		       		self.placeInfoPages.push({
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
	}

	//construct wiki link
	function constructWikiLink(title) {
	 	return wikiLink+title;
	}
};

/* ============================================
 *  			Flickr View Model
/* ============================================ */
var FlickrViewModel = function() {
	var self = this;

	var endpoint = 'https://api.flickr.com/services/rest/';
	var api_key  = 'ae6f6113a6236df9a8fe6eb32616175d';

	self.instagramEnabled		= ko.observable(false);
	self.neighborhoodImages	 	= ko.observableArray([]);
	self.neighborhoodLoc		= ko.observable();
	self.myNeighborhood			= ko.observable();


	shouter.subscribe(function(newValue){
    	self.instagramEnabled(newValue);
    }, self, "instagramEnabled");

    shouter.subscribe(function(newValue){
    	self.neighborhoodLoc(newValue);
    }, self, "neighborhoodLoc");

    shouter.subscribe(function(newValue){
    	self.myNeighborhood(newValue);
    	self.neighborhoodImages([]);
    }, self, "neighborhood");

	self.computedLoadInstagram = ko.computed(function(){
		// quit function in case instagram  window is closing
		if ( !self.instagramEnabled() || self.neighborhoodImages().length > 0 ) {
			//TODO: think of utilizing local storage to save loaded pics
			return;
		}

		loadImages();

	});


	function loadImages() {
		var min_upload_date  =  Date.now() - 60 * 60 * 24 * 30, // (30 days in ms)
			privacy_filter  	= 1, 	//public photos
			content_type  		= 1, 	//photos only
			lat 				= self.neighborhoodLoc().lat(),
			lng 				= self.neighborhoodLoc().lng(),
			text 				= self.myNeighborhood(),
			per_page 			= 20;

		var url = endpoint+"?method=flickr.photos.search&api_key="+api_key+"&lat="+lat+"&lng="
					+lng+"&text="+text+"&privacy_filter="
					+privacy_filter+"&content_type="+content_type+"&per_page="+per_page;



		$.ajax({
			url: url,
			data: "format=json",
			jsonp: "jsoncallback",
			dataType: "jsonp",
			success: function(data)

				{
		   			for (var i = 0 ; i < data.photos.photo.length ; i++) {

		   				self.neighborhoodImages.push({
		   					"title"		: data.photos.photo[i].title,
		   					"owner"		: data.photos.photo[i].owner,
		   					"pic_thumb"	: constructImageURL(data.photos.photo[i], 'z'),
		   					"pic"		: constructImageURL(data.photos.photo[i], 'b')
		   				});
		   			}
				},
    		error: function()
        		{
            	//TODO: add error handling
        	}
		});

		console.log(self.neighborhoodImages());
	}


	/* Sizes
		s	small square 75x75
		q	large square 150x150
		t	thumbnail, 100 on longest side
		m	small, 240 on longest side
		n	small, 320 on longest side
		-	medium, 500 on longest side
		z	medium 640, 640 on longest side
		c	medium 800, 800 on longest side†
		b	large, 1024 on longest side*
		h	large 1600, 1600 on longest side†
		k	large 2048, 2048 on longest side†
		o	original image, either a jpg, gif or png, depending on source format
	*/
	function constructImageURL(photoObj, size) {

		return "https://farm"+photoObj.farm+".staticflickr.com/"+photoObj.server+"/"+photoObj.id+"_"+photoObj.secret+"_"+size+".jpg";
	}
};

/* ============================================
 *  			Instagram View Model
/* ============================================ */
var InstagramViewModel = function() {

	var self = this;

	var endpoint 		= "https://api.instagram.com/v1/";
	var access_token 	= '36229642.37a7c6f.21f4b44989b94872b6116fe8eeededf8';


	self.instagramEnabled		= ko.observable(false);
	self.neighborhoodImages	 	= ko.observableArray([]);
	self.neighborhoodLoc		= ko.observable();


	shouter.subscribe(function(newValue) {
    	self.instagramEnabled(newValue);
    }, self, "instagramEnabled");

	shouter.subscribe(function(newValue) {
		self.neighborhoodLoc(newValue);
	}, self, "neighborhoodLoc");

};


/* ============================================
 *  			Map View Model
/* ============================================ */

var MapViewModel = function() {

	/* VARIABLES */

	var self = this;
	var map,  				// google map object
		placesService,      // google places service object
		infoWindow;			// google info window object

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

	// TODO: make it current user location
	var defaultNeighborhood = "Tushino";	// default neighborhood
	var nearbyMarkers	= [];				// array with nearby places markers


	var GMAPS_PLACESSERVICE_STATUS_OK = google.maps.places.PlacesServiceStatus.OK;
	var GMAPS_PLACESSERVICE_STATUS_OVER_QUERY_LIMIT = google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT;


	/* 	OBSERVABLES  */

	self.myNeighborhood 		= ko.observable( defaultNeighborhood ); 	// current neighborhood
	self.neighborhoodLoc		= ko.observable();
	self.nearbyPlaces 			= ko.observableArray([]);					// list of nearby places
	self.keywordSearch			= ko.observable("");						// search keyword
	self.chosenMarker 			= ko.observable("");

	self.bikeLayerEnabled 		= ko.observable(false);					// boolean value, indicating whether bike layer is currently enabled or disabled
	self.trafficLayerEnabled 	= ko.observable(false);					// boolean value, indicating whether traffic layer is currently enabled or disabled
	self.transitLayerEnabled 	= ko.observable(false);					// boolean value, indicating whether transit layer is currently enabled or disabled

	self.showAddInfoWindow 		= ko.observable(false);
	self.loading 				= ko.observable(false);

	self.nothingFound 			= ko.observable(false);


	self.myNeighborhood.subscribe(function(newValue) {
		shouter.notifySubscribers(newValue, "neighborhood");
	});

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

	// UI Events
	self.panMapToClickedPlace = function() {

		map.panTo(this.marker.position);
		new google.maps.event.trigger(this.marker, 'click');
	};


	self.resetSearchFilter = function() {
		self.keywordSearch("");
		requestNeighborhood();
	};


	/*
		initialize map
	*/

	initMap();

	$(document).click(function(event){
		if ( $(event.target).closest('div.addinfo-content').length > 1 ) {
			self.showAddInfoWindow(false);
		}

	});



	// COMPUTED OBSERVABLES
	/*
		load neighborhood on the map depending on the chosen neighborhood
	*/

	self.computedNeighborhood = ko.computed(function() {
		if (self.myNeighborhood() !== '') {
			// WikiViewModel.placeInfoPages([]);
			// InstagramViewModel.neighborhoodImages([]);
			requestNeighborhood();
		}

	});


	self.computedKeywordSearch	= ko.computed(function() {

		if (self.keywordSearch() !== "") {
			//requestNearbyPlacesKeyword();
			//Filter list by name and type
			var keywords = self.keywordSearch().split(' ');
			filterPlaces(keywords);


		}

		//Filter list by name----

	});

	self.markerAnimationIsRunning = ko.computed(function() {
		if (self.chosenMarker() !== "") {

			//stop animation of others
			self.nearbyPlaces().forEach(function(item) {
				item.marker.setAnimation(null);
			});

  			if (self.chosenMarker().getAnimation() != null) {
    			self.chosenMarker().setAnimation(null);
    			return false;
  			} else {
    			self.chosenMarker().setAnimation(google.maps.Animation.BOUNCE);
  				return true;
  			}
		}

	});

	// initialize map
	function initMap() {

		shouter.notifySubscribers(self.myNeighborhood(), "neighborhood");

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

			shouter.notifySubscribers(myLocation, "neighborhoodLoc");

			map.setCenter(myLocation);
			//set marker

			//load photos
			// Doesn't work currently
			// var myKey = "AIzaSyCV9N5j38lkbSHp46-pYU5Wh01ijgSwq4w";

			// var url = "https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference="+place.reference+"sensor=true&key="+myKey;

			// console.log(url);
			// $.ajax({
			// 	url : url,
			// 	dataType: 'jsonp',
			// 	success: function(data) {
			// 		console.log(data);
			// 	}

			// })

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
		};

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
		};

		placesService.textSearch(request, loadNearbyPlaces);
	}

	/*
		Load returned places to the list of places and load respective markers on the map
	*/

	function loadNearbyPlaces(results, status, pagination) {

		if (status === GMAPS_PLACESSERVICE_STATUS_OK) {
			//Load places list
			self.nearbyPlaces([]);
			// clearMarkers();

			// var service = new google.maps.places.PlacesService(map);
			// recursive function (a work around for request limit)
			var process_result = function (result, i) {


				self.loading(true);

				if (i >= result.length){
					self.loading(false);
					return;

				}

				var request = {
					placeId: result[i].place_id
			    };
			      
			 	placesService.getDetails(request, function(place, status) {
				if (status === GMAPS_PLACESSERVICE_STATUS_OK)   {


					// var placeMarker = new google.maps.Marker({
					// 	position	: place.geometry.location,
					// 	name 		: place.name,
					// 	address 	: place.formatted_address,
					// 	phone 		: place.formatted_phone_number

					// 	//add more options used by info window
					// });

					//create mearby place
					self.nearbyPlaces.push({
						name		: place.name,
						icon		: place.icon,
						address		: place.formatted_address,
						phone 		: place.formatted_phone_number,
						types		: place.types,
						rating		: place.user_ratings_total,
						website		: place.website,
						reviews		: place.reviews,
						photos		: place.photos
						// marker 		: placeMarker

					});

					nearbyMarkers.push(new google.maps.Marker({
						position	: place.geometry.location,
						name 		: place.name,
						address 	: place.formatted_address,
						phone 		: place.formatted_phone_number

						//add more options used by info window
					}));

					setMarker(nearbyMarkers[i], place);

  					//setMarker(marker, place);

					// increment 'i'
					process_result(result, i+1);

				} else if (status === GMAPS_PLACESSERVICE_STATUS_OVER_QUERY_LIMIT) {

						// wait 200ms, then try again with same 'i'
						window.setTimeout(function (){
							process_result(result, i);
						}, 200);
			 	}
			}); // process_result() function end

		};

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
		filter places by search key contained in place name or types
	*/
	function filterPlaces(words) {


		var list = [];

		self.nearbyPlaces().forEach(function(item) {


			var str = item.name;
			for (var i=0; i < words.length; i++) {
				//checking that place name contains search word
				if (str.toLowerCase().indexOf(words[i]) >= 0) {
					list.push(item);
				}
			}

		});

		self.nearbyPlaces(list);
	}
	/*
		Set marker on the map
		Assign trigger event on click

	*/

	function setMarker(marker, place) {

		marker.setMap(map);

		//add info window  event on marker

		google.maps.event.addListener(marker, 'click', function() {
			// get place additional information
        	infoWindow.setContent( "<div id='infowindow-div' class='noscroll'><h6>" + marker.name + "</h6><p>" + marker.address + "</p><span>"+ marker.phone +"</span></div>" );
        	infoWindow.open(map, this);
        	map.panTo(marker.position);
  			self.chosenMarker(marker);
      	});


    	google.maps.event.addListener(infoWindow,'closeclick',function(){
    		if (self.chosenMarker() !== "" && self.chosenMarker().getAnimation() != null) {
    			self.chosenMarker().setAnimation(null);
    		}
    		self.chosenMarker("");
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
		}

		//transit layer
		if (self.transitLayerEnabled()) {
			//show layer
			transitLayer.setMap(map);
		} else {
			//hide layer
			transitLayer.setMap(null);
		}

		//traffic layer
		if (self.trafficLayerEnabled()) {
			//show
			trafficLayer.setMap(map);
		} else {
			//hide
			trafficLayer.setMap(null);
		}
	}
};

/* =================================================
 *	Master View Model
 * =================================================*/
var masterViewModel = function() {

	this.AddInfoViewModel	= new AddInfoViewModel();
	this.WikiViewModel 		= new WikiViewModel();
	this.InstagramViewModel = new InstagramViewModel();
	this.FlickrViewModel  	= new FlickrViewModel();
	this.MapViewModel		= new MapViewModel();
};

ko.applyBindings(new masterViewModel());
