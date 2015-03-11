var shouter = new ko.subscribable();


/***************************************************************

	AddInfoViewModel is handling addinfo-wrapper related functionality

****************************************************************/
var AddInfoViewModel = function() {

	var self 		= this;
	var $wikiBtn	= $('#wikibtn');	// DOM element holding wiki button
	var $flickrBtn	= $('#flickrbtn');	// DOM element holding flickr button @TODO: additional feature planned for next version

	self.wikiEnabled			= ko.observable(false);			// boolean value, indicating whether wiki view is currently active or not
	self.flickrEnabled   		= ko.observable(false);			// boolean value, indicating whether instagram view is currently active or not @TODO: additional feature planned for next version
	self.addInfoLoading 		= ko.observable(false);			// boolean value, indicating whether additional info panel is currently loading its content
	self.showAddInfoWindow      = ko.observable(false);			// boolean value, indicating whether additional info window should be shown or not

	/*	register notifier to send updates whenever wikiEnabled value gets changed
	*/
	self.wikiEnabled.subscribe(function(newValue) {
		shouter.notifySubscribers(newValue, "wikiEnabled");
	});


	/*	register notifier to send updates whenever flickeEnabled value gets changed
		@TODO: additional feature planned for next version
	*/
	self.flickrEnabled.subscribe(function(newValue) {
		shouter.notifySubscribers(newValue, "flickrEnabled");
	});


	/* toggles wiki info window visibility status
	*/
	self.toggleWiki = function() {
		self.wikiEnabled( !self.wikiEnabled() );
		if ( self.wikiEnabled() ) {
			$wikiBtn.addClass('selected');
			self.flickrEnabled(false);
		} else {
			$wikiBtn.removeClass('selected');
		}
	};


	/* @TODO: additional feature planned for next version
	*/
	self.toggleFlickr = function() {
		self.flickrEnabled( !self.flickrEnabled() );
		if ( self.flickrEnabled() ) {
			self.wikiEnabled(false);
		}
	};


	/*
		show/hide addinfo-content by adding/removing 'show-addinfo' class, when wiki button is toggled.
	*/
	self.showAddInfoWindow	= ko.computed(function() {
		var $addinfo = $(".addinfo-content");
		if ( self.flickrEnabled() || self.wikiEnabled() ) {
			$addinfo.addClass('show-addinfo');
			return true;
		} else if ( !self.flickrEnabled() && !self.wikiEnabled()) {
			$addinfo.removeClass('show-addinfo');
			return false;
		}
	});

};


/***************************************************************

	WikiViewModel is handling wiki related content

****************************************************************/

var WikiViewModel = function() {

	var self = this;

	var endpoint = "http://en.wikipedia.org/w/api.php?";  	//wikipedia api endpoint
	var wikiLink = "http://en.wikipedia.org/wiki/" ; 		//wikipedia pages link

	/************************************
				OBSERVABLES
	*************************************/

	self.wikiPages 				= ko.observableArray([]); 	// array with found wiki pages
    self.myNeighborhood 		= ko.observable("");		// string holding neighborhood
    self.wikiEnabled  			= ko.observable(false); 	// boolean value, indicating whether wiki view is currently enabled or disabled
    self.wikiErrorMsg			= ko.observable("");		// string holding wiki api last error - normally expected to be ""
    self.loading 				= ko.observable(false);     // boolean value, indicating whether wiki view is currently loading its content

    /* register listener to wikiEnabled value
    */
    shouter.subscribe(function(newValue){
    	self.wikiEnabled(newValue);
    }, self, "wikiEnabled");

    /* register listener to myNeighborhood value
    	whenever neighborhood is changed let's reset current wiki pages set
    */
    shouter.subscribe(function(newValue) {
        self.myNeighborhood(newValue);
        self.wikiPages([]);
    }, self, "neighborhood");


    /************************************
			COMPUTED OBSERVABLES
	*************************************/

    /* run wiki pages search when wiki view is enabled
    */
    self.wikiEnabledComputed = ko.computed(function(){
    	if (self.wikiEnabled()) {
    		searchWikiPages(self.myNeighborhood());
    	}
    });

    /* function performs text search of top 5 wiki pages, containing myNeighborhood value in the content.
    */
	function searchWikiPages(searchStr) {


		if ( !self.wikiEnabled() || self.wikiPages().length > 0 ) {
			return;
		}


		var url = endpoint+"format=json&action=query&list=search&srsearch="+searchStr+"&srlimit=5&callback=?";


		/* register the error in case wiki pages search didn't succeed for some reason.
		*/
		var wikiRequestTimeout = setTimeout(function() {
			self.wikiErrorMsg("Failed to get wikipedia resources");
			self.loading(false);
		}, 3000);

		self.loading(true);
		self.wikiErrorMsg("");

		$.ajax({
	    	url: url,
	    	dataType: 'jsonp',
	    	success: function(data) {
	    		for (var i = 0; i < data.query.search.length; i++) {
		       		self.wikiPages.push({
		        		title 	: data.query.search[i].title,
		        		link 	: constructWikiLink(data.query.search[i].title),
		        		snippet	: data.query.search[i].snippet
		        	});
				}
				/* remove need of running error hanling  wikiRequestTimeout function , as we got success completion.
				*/
				clearTimeout(wikiRequestTimeout);
				self.loading(false);
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
/* @TODO: Additional feature to add in next version
 * Object is not used by current version of application.
 */
var FlickrViewModel = function() {
	var self = this;

	var endpoint = 'https://api.flickr.com/services/rest/';
	var api_key  = 'ae6f6113a6236df9a8fe6eb32616175d';

	self.flickrEnabled			= ko.observable(false);
	self.neighborhoodImages	 	= ko.observableArray([]);
	self.neighborhoodLoc		= ko.observable();
	self.myNeighborhood			= ko.observable();
	self.flickrErrorMsg			= ko.observable("");

	/* register listener for flickEnabled value
	*/
	shouter.subscribe(function(newValue){
    	self.flickrEnabled(newValue);
    }, self, "flickrEnabled");

    /* register listener for neighborhoodLoc value
	*/
    shouter.subscribe(function(newValue){
    	self.neighborhoodLoc(newValue);
    }, self, "neighborhoodLoc");

    /* register listener for myNeighborhood value
	*/
    shouter.subscribe(function(newValue){
    	self.myNeighborhood(newValue);
    	self.neighborhoodImages([]);
    }, self, "neighborhood");


	/* Initiate loading of flickr images
	*/
	self.computedLoadFlickr = ko.computed(function(){

		if ( !self.flickrEnabled() || self.neighborhoodImages().length > 0 ) {
			return;
		}

		loadImages();

	});


	/* Requests flickr images utilizing flickr api
	*/
	function loadImages() {

		var min_upload_date  	=  Date.now() - 60 * 60 * 24 * 30, 	// (30 days in ms)
			privacy_filter  	= 1, 								// public photos
			content_type  		= 1, 								// photos only
			lat 				= self.neighborhoodLoc().lat(),		// lat value of current neighborhood
			lng 				= self.neighborhoodLoc().lng(), 	// lng value of current neighborhood
			text 				= self.myNeighborhood(),			// string with current neighborhood
			per_page 			= 20;								// number of images per page


		var url = endpoint+"?method=flickr.photos.search&api_key="+api_key+"&lat="+lat+"&lng="
					+ lng+"&text="+text+"&privacy_filter="
					+ privacy_filter+"&content_type="+content_type+"&per_page="+per_page;

		/* register the error in case wiki pages search didn't succeed for some reason.
		*  function will be run in 5s in case ajax call below doesn't return success.
		*/
		var FlickrRequestTimeout = setTimeout(function(){
			self.flickrErrorMsg("Failed to load Flickr images");
		}, 5000);

		$.ajax({
			url: url,
			data: "format=json",
			jsonp: "jsoncallback",
			dataType: "jsonp",
			success: function(data) {
	   			for (var i = 0 ; i < data.photos.photo.length ; i++) {
	   				self.neighborhoodImages.push({
	   					"title"		: data.photos.photo[i].title,
	   					"owner"		: data.photos.photo[i].owner,
	   					"pic_thumb"	: constructImageURL(data.photos.photo[i], 'z'),
	   					"pic"		: constructImageURL(data.photos.photo[i], 'b')
	   				});
	   			}
	   			/* remove need of running error hanling  timeout function , as we got success completion.
				*/
	   			clearTimeout(FlickrRequestTimeout);
			}
		});
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

	var radius = 2000; 		// search radius in meters

	var nearbyMarkers = [];	// array with nearby places markers

	var GMAPS_PLACESSERVICE_STATUS_OK = google.maps.places.PlacesServiceStatus.OK; 								//google places service return status: "OK"
	var GMAPS_PLACESSERVICE_STATUS_OVER_QUERY_LIMIT = google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT;	//google places service return status: "OVER_QUERY_LIMIT"


	/* 	OBSERVABLES  */

	self.myNeighborhood 		= ko.observable(""); 				// current neighborhood
	self.neighborhoodLoc		= ko.observable();					// current neighborhood location (@TODO: format)
	self.nearbyPlaces 			= ko.observableArray([]);			// list of nearby places
	self.noPlacesToShow			= ko.observable(true);				// boolean, that indicates whether there are or no nearby places to show

	self.keywordSearch			= ko.observable("");				// search keyword
	self.chosenMarker 			= ko.observable("");				// holds marker , which is currently chosen by user

	self.bikeLayerEnabled 		= ko.observable(false);				// boolean value, indicating whether bike layer is currently enabled or disabled
	self.trafficLayerEnabled 	= ko.observable(false);				// boolean value, indicating whether traffic layer is currently enabled or disabled
	self.transitLayerEnabled 	= ko.observable(false);				// boolean value, indicating whether transit layer is currently enabled or disabled

	self.showAddInfoWindow 		= ko.observable(false);				// boolean value, indicating whether addinfo-wrapper is currently shown or hidden
	self.loading 				= ko.observable(false);				// boolean value, indicating whether content is currently loading or not.
	self.errorMsg				= ko.observable("");


	/* register notification about myNeighborhood value changes
	*/
	self.myNeighborhood.subscribe(function(newValue) {
		shouter.notifySubscribers(newValue, "neighborhood");
	});



	/* toggle bike layer upon bike icon click
	*/
	self.toggleBikeLayer = function() {
		self.bikeLayerEnabled( !self.bikeLayerEnabled() );
		showHideLayers();
	};

	/* toggle traffic layer upon bike icon click
	*/
	self.toggleTrafficLayer = function() {
		self.trafficLayerEnabled( !self.trafficLayerEnabled() );
		showHideLayers();
	};

	/* toggle transit layer upon bike icon click
	*/
	self.toggleTransitLayer = function() {
		self.transitLayerEnabled( !self.transitLayerEnabled() );
		showHideLayers();
	};


	/* Triggered when user clicks to the nearby place from the list and
	 * pans map center to respective marker
	*/
	self.panMapToClickedPlace = function() {
		for (var i=0; i < nearbyMarkers.length; i++) {
			if (nearbyMarkers[i].name === this.name) {
				//pan map to marker
				map.panTo(nearbyMarkers[i].position);
				new google.maps.event.trigger( nearbyMarkers[i], 'click' );
			}
		}
	};

	/* horizontal scrolling for places list controlled by arrows  (for mobile users)
	*/
	self.scrollPlacesList = function(delta) {
		var $places = $('.places-list-wrapper .content');

		var scrollStep = $places[0].scrollLeft + $places.width() / 2 * delta;
		console.log(scrollStep);
		$places.animate({
			scrollLeft :  scrollStep
		}, 600);

	}

	initMap();


	/* reset places list left scroll position to 0, when window is resized.
	*/
	$(window).resize(function () {
		$('.places-list-wrapper .content')[0].scrollLeft = 0 ;

	})

	/************************************************************************
								COMPUTED OBSERVABLES
	*************************************************************************/
	/*
		track changes of myNeighborhood value and initiate neighborhood loading activities.
	*/
	self.computedNeighborhood = ko.computed(function() {
		if (self.myNeighborhood() !== '') {
			requestNeighborhood();
		}

	});

	/* toggles markers selected animation, i.e launches animation for selected marker, stops animation for other markers
	*/
	self.markerAnimationIsRunning = ko.computed(function() {
		if (self.chosenMarker() !== "") {
			//stop animation of others
			nearbyMarkers.forEach(function(item) {
				item.setAnimation(null);
			});

  			if (self.chosenMarker().getAnimation() !== null) {
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
			mapTypeControl: true,
			panControl: true,
			panControlOptions: {
  				position: google.maps.ControlPosition.LEFT_CENTER
			},
			zoomControl: true,
			zoomControlOptions: {
  				style: google.maps.ZoomControlStyle.LARGE,
  				position: google.maps.ControlPosition.LEFT_CENTER
			},
			streetViewControl: false
  		};

  		map 			= new google.maps.Map(document.querySelector('#map'), mapOptions);

  		infoWindow		= new google.maps.InfoWindow();
  		placesService 	= new google.maps.places.PlacesService(map);

  		bikeLayer 	 	= new google.maps.BicyclingLayer();
  		trafficLayer 	= new google.maps.TrafficLayer();
  		transitLayer 	= new google.maps.TransitLayer();

  		/* adjust map center upon window resize
  		*/
  		google.maps.event.addDomListener(window, "resize", function() {
     		var center = map.getCenter();
     		google.maps.event.trigger(map, "resize");
     		map.setCenter(center);
    	});
	}


	/* 	Executes text search request using  google placesService.
	 */
	function requestNeighborhood() {
		//reset settings
		nearbyMarkers = [];
		clearMarkers();
		self.nearbyPlaces([]);
		self.keywordSearch("");
		self.chosenMarker("");

		var request = {
    		query: self.myNeighborhood()
  		};


  		placesService.textSearch(request, loadNeighborhood);
	}


	/*  requestNeighborhood callback
		 loads found neighborhood on the map and launches nearby places search.
	*/

	function loadNeighborhood(results, status) {

		if (status === GMAPS_PLACESSERVICE_STATUS_OK) {

			var place 		= results[0];
			var lat 		= place.geometry.location.lat();
			var lng 		= place.geometry.location.lng();

			var myLocation	= new google.maps.LatLng(lat,lng);

			shouter.notifySubscribers(myLocation, "neighborhoodLoc");

			map.setCenter(myLocation);
			requestNearbyPlaces();

		} else {
			self.errorMsg("Failed to load neighborhood due to the following issue: "+status);
		}
	}

	/* Request nearby places
	 * 	Executes nearby search using  google placeService
	*/
	function requestNearbyPlaces() {
		/*
			find places within 2000  radius from our neighborhood;
		*/
		var request = {
			location: map.getCenter(),
			radius: radius,
			types:placesTypes
		};

		placesService.nearbySearch(request, loadNearbyPlaces);

	}


	/* requestNearbyPlaces callback
		Gets additional details on the returned place , loads respective markers on the map.
		Due to Google limitation of 10 requests in 1s , places details request was implemented as a recursive 'process_result' function, which is being timedout
		and relaunched whenever limit reject is received from google .
	*/

	function loadNearbyPlaces(results, status) {

		if (status === GMAPS_PLACESSERVICE_STATUS_OK) {

			// recursive function (a work around for Google request count limitation)
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

						self.nearbyPlaces.push({
							name		: place.name,
							icon		: place.icon,
							address		: place.formatted_address,
							phone 		: place.formatted_phone_number,
							types		: place.types,
							rating		: place.user_ratings_total,
							website		: place.website,
							reviews		: place.reviews,
							photos		: place.photos,
							showItem	: true

						});

						nearbyMarkers.push(new google.maps.Marker({
							position	: place.geometry.location,
							name 		: place.name,
							address 	: place.formatted_address,
							phone 		: place.formatted_phone_number,
							showMarker  : true
						}));

						//set place marker on the map
						setMarker(nearbyMarkers[i], place);

						// increment 'i' (step to next place item)
						process_result(result, i+1);

						// when we initially load nearby places there is no need to filter out their visibility in places list,
						// so we know that at least one item will be displayed.
						self.noPlacesToShow(false);

					} else if (status === GMAPS_PLACESSERVICE_STATUS_OVER_QUERY_LIMIT) {
						// wait 200ms, then try again with same place item
						window.setTimeout(function (){
							process_result(result, i);
						}, 200);
				 	}
				});

			};

			process_result(results, 0);

		} else { // nearbyPlaces request returned in errorneous state

			self.errorMsg("Failed to load neighborhood places due to :"+ status);
		}

	}


	/*
		filter places list according to value entered by user and stored in  keywordSearch observable
	*/
	self.filterPlaces = function () {

		var words = self.keywordSearch().split(' ');
		var list  = self.nearbyPlaces();

		self.nearbyPlaces([]);
		self.noPlacesToShow(true);

		/*
			Run through list of places and find places having keywordSearch value contained in the name
			or types . For those mark these places and respective markers as visible (showItem / showMarker = true)
			Others places should be set to unvisible.
		*/
		list.forEach(function(item) {

			var str = item.name;
			var found = false;

			for (var i=0; i < words.length; i++) {
				//checking that place name contains search word
				if  (words.length === 1 && words[i] === "") {
					found = true;
				} else {
					if (str.toLowerCase().indexOf(words[i].toLowerCase()) >= 0) {
						found = true;
					} else {

						//check that place type contains search word
						for (var j = 0 ; j < item.types.length ; j++) {
							if ( item.types[j].toLowerCase().indexOf(words[i].toLowerCase()) >= 0 )   {
								found = true;
								break;
							}
						}
					}
				}

				/* check whether we have anything to be shown in places list
				*/
				if ( self.noPlacesToShow() ) {
					( found ) ? self.noPlacesToShow(false) : self.noPlacesToShow(true);
				}
				item.showItem = found;
				setMarkerVisibility(item, found);
				self.nearbyPlaces.push(item);
			}

		});

		//load filtered list into UI
		self.nearbyPlaces(list);
		//re-load markers on the map (only enabled will be shown)
		setMarkers(nearbyMarkers);
	};


	/*
		Set marker visibility on the map according to their showMarker value.
	*/
	function setMarkerVisibility(place, bool) {
		nearbyMarkers.forEach(function(item){
			if (place.name === item.name) {
				item.showMarker = bool;
			}
		});
	}
	/*
		Set marker on the map
		Assign trigger event on click
	*/
	function setMarker(marker) {

		marker.setMap(map);

		//add info window  event on marker

		google.maps.event.addListener(marker, 'click', function() {
			// get place additional information
        	infoWindow.setContent( "<div class='infowindow-div noscroll'><h6>" + marker.name + "</h6><p>" + marker.address + "</p><span>"+ marker.phone +"</span></div>" );
        	infoWindow.open(map, this);
        	map.panTo(marker.position);
  			self.chosenMarker(marker);
      	});

		// stop marker animation whenever infoWindow is closed
    	google.maps.event.addListener(infoWindow,'closeclick',function(){
    		if (self.chosenMarker() !== "" && self.chosenMarker().getAnimation() !== null) {
    			self.chosenMarker().setAnimation(null);
    		}
    		self.chosenMarker("");
    	});

	}

	/*
		Apply markers on the map
	*/
	function setMarkers() {
		clearMarkers();
  		for (var i = 0; i < nearbyMarkers.length; i++) {
  			if (nearbyMarkers[i].showMarker) {
  				nearbyMarkers[i].setMap(map);
  			}

  		}
	}

	/* Clear markers on  the map
	*/
	function clearMarkers() {
		for (var i = 0; i < nearbyMarkers.length; i++) {
    		nearbyMarkers[i].setMap(null);
  		}
  		//nearbyMarkers = [];
	}


	/*
		Toggle map layers according to icon clicked.
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
	//@TODO: Additional feature planned for next version
	// this.FlickrViewModel  	= new FlickrViewModel();
	this.MapViewModel		= new MapViewModel();
};

ko.applyBindings(new masterViewModel());
