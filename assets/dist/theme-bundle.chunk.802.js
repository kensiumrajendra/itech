"use strict";(self.webpackChunkbigcommerce_cornerstone=self.webpackChunkbigcommerce_cornerstone||[]).push([[802],{41802:function(e,t,i){i.r(t),i.d(t,{default:function(){return f}});var r=i(49230),n=i(37030),o=i(28350),a=i(78341),c=i(55825),d=function(){function e(e){this.$player=e.find("[data-video-player]"),this.$videos=e.find("[data-video-item]"),this.currentVideo={},this.bindEvents()}var t=e.prototype;return t.selectNewVideo=function(e){e.preventDefault();var t=c(e.currentTarget);this.currentVideo={id:t.data("videoId"),$selectedThumb:t},this.setMainVideo(),this.setActiveThumb()},t.setMainVideo=function(){this.$player.attr("src","//www.youtube.com/embed/"+this.currentVideo.id)},t.setActiveThumb=function(){this.$videos.removeClass("is-active"),this.currentVideo.$selectedThumb.addClass("is-active")},t.bindEvents=function(){this.$videos.on("click",this.selectNewVideo.bind(this))},e}(),s=i(67313),u=i(44505),l=i(55825);function v(e,t){return v=Object.setPrototypeOf||function(e,t){return e.__proto__=t,e},v(e,t)}var f=function(e){var t,i;function r(t){var i;return(i=e.call(this,t)||this).url=window.location.href,i.$reviewLink=l('[data-reveal-id="modal-review-form"]'),i.$bulkPricingLink=l('[data-reveal-id="modal-bulk-pricing"]'),i.reviewModal=(0,u.ZP)("#modal-review-form")[0],i}i=e,(t=r).prototype=Object.create(i.prototype),t.prototype.constructor=t,v(t,i);var f=r.prototype;return f.onReady=function(){var e,t,i=this;l(document).on("close.fndtn.reveal",(function(){-1!==i.url.indexOf("#write_review")&&"function"==typeof window.history.replaceState&&window.history.replaceState(null,document.title,window.location.pathname)})),(0,o.ZP)(),this.productDetails=new a.Z(l(".productView"),this.context,window.BCData.product_attributes),this.productDetails.setProductVariant(),c("[data-"+(t="video-gallery")+"]").each((function(e,i){var r=c(i);r.data(t)instanceof d||r.data(t,new d(r))})),this.bulkPricingHandler();var r=(0,s.iR)(".writeReview-form");if(0!==r.length){var u=new n.Z({$reviewForm:r});l("body").on("click",'[data-reveal-id="modal-review-form"]',(function(){e=u.registerValidation(i.context),i.ariaDescribeReviewInputs(r)})),r.on("submit",(function(){return!!e&&(e.performCheck(),e.areAll("valid"))})),this.productReviewHandler()}},f.ariaDescribeReviewInputs=function(e){e.find("[data-input]").each((function(e,t){var i=l(t),r=i.attr("name")+"-msg";i.siblings("span").attr("id",r),i.attr("aria-describedby",r)}))},f.productReviewHandler=function(){-1!==this.url.indexOf("#write_review")&&this.$reviewLink.trigger("click")},f.bulkPricingHandler=function(){-1!==this.url.indexOf("#bulk_pricing")&&this.$bulkPricingLink.trigger("click")},r}(r.Z)}}]);
//# sourceMappingURL=theme-bundle.chunk.802.js.map