(function( jQuery ) {

if ( window.XDomainRequest ) {
	jQuery.ajaxTransport(function( s, options ) {
		if ( s.crossDomain && s.async ) {
			if ( s.timeout ) {
				s.xdrTimeout = s.timeout;
				delete s.timeout;
			}
			var xdr;
			return {
				send: function( _, complete ) {
					function callback( status, statusText, responses, responseHeaders ) {
						xdr.onload = xdr.onerror = xdr.ontimeout = xdr.onprogress = jQuery.noop;
						xdr = undefined;
						complete( status, statusText, responses, responseHeaders );
					}
					xdr = new XDomainRequest();
					xdr.onload = function() {
						callback( 200, "OK", { text: xdr.responseText }, "Content-Type: " + xdr.contentType );
					};
					xdr.onerror = function() {
						callback( 404, "Not Found" );
					};
					if ( s.xdrTimeout ) {
						xdr.ontimeout = function() {
							callback( 0, "timeout" );
						};
						xdr.timeout = s.xdrTimeout;
					}
					xdr.open( s.type, s.url );
					// Have to wrap the send in a timeout to stop IE aborting the requests early, not sure why.
					setTimeout(function () {
						xdr.send( ( s.hasContent && s.data ) || null );
					}, 0);
				},
				abort: function() {
					if ( xdr ) {
						xdr.onerror = jQuery.noop;
						xdr.abort();
					}
				}
			};
		}
	});
}
})( jQuery );
