/*jslint white: true, indent: 2 */
/*global $, Libertree */

$(document).ready( function() {
  "use strict";

  $(document).on('click', '.post-tools .collect', Libertree.Pools.collectHandler);
  $(document).on('click', '.post-tools .remove', Libertree.Pools.removePostHandler);

  $(document).on('click', '.create-pool-and-add-post', function(e) {
    e.preventDefault();
    var post = $(this).closest('.post, .post-excerpt');
    Libertree.Pools.createPoolAndAddPost(post);
    return false;
  } );

  $(document).on('keydown', '.pools .chzn-search input', function(event) {
    if( event.keyCode !== 13 ) {
      return;
    }

    var post = $(this).closest('.post, .post-excerpt');
    Libertree.Pools.createPoolAndAddPost(post);
  } );

  $('li.pool a.delete').click( Libertree.UI.confirmAction );

  $('.excerpts-view.pool #river-selector').chosen().change( function (event) {
    event.preventDefault();
    var selector = $('.excerpts-view.pool #river-selector'),
      riverId = selector.val(),
      poolId = selector.data('pool-id'),
      url = '/rivers/add_spring/'+riverId+'/'+poolId;

    Libertree.UI.listHandler( selector, url );
  } );
} );
