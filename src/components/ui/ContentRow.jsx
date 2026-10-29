import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import ContentCard from './ContentCard';
import { CardSkeleton } from './LoadingSpinner';

/**
 * Horizontal scrollable content row using Swiper.
 * @param {string} title - section heading
 * @param {Array} items - TMDB items array
 * @param {string} seeAllLink - route for "See All" button
 * @param {'poster' | 'backdrop' | 'clip'} cardVariant - card type ('clip' = 16:9 with play icon + title below)
 * @param {(item) => ReactNode} renderItem - custom card renderer (items then need a unique `id`)
 * @param {boolean} loading - show skeleton
 */
export default function ContentRow({
  title,
  items = [],
  seeAllLink,
  cardVariant = 'poster',
  renderItem,
  loading = false,
}) {
  if (!loading && (!items || items.length === 0)) return null;

  const wide = cardVariant !== 'poster';
  const slidesPerView = cardVariant === 'clip'
    ? { xs: 1.6, sm: 2.4, md: 2.8, lg: 4.2, xl: 5.2 }
    : cardVariant === 'backdrop'
    ? { xs: 1.5, sm: 2.5, md: 3, lg: 4, xl: 5 }
    : { xs: 2.5, sm: 3.5, md: 4.5, lg: 5.5, xl: 7 };

  return (
    <section className="mb-10 px-4 sm:px-8 lg:px-12">
      {/* Row header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">{title}</h2>
        {seeAllLink && (
          <Link
            to={seeAllLink}
            className="text-sm font-medium text-[#a8aeba] hover:text-white transition-colors flex items-center gap-1"
          >
            View All ›
          </Link>
        )}
      </div>

      {/* Skeleton */}
      {loading ? (
        <CardSkeleton count={wide ? 4 : 7} wide={wide} />
      ) : (
        <Swiper
          modules={[Navigation, A11y]}
          navigation
          spaceBetween={8}
          slidesPerView={slidesPerView.xs}
          breakpoints={{
            475: { slidesPerView: slidesPerView.sm, spaceBetween: 8 },
            640: { slidesPerView: slidesPerView.md, spaceBetween: 10 },
            1024: { slidesPerView: slidesPerView.lg, spaceBetween: 10 },
            1280: { slidesPerView: slidesPerView.xl, spaceBetween: 10 },
          }}
          className="content-row-swiper"
        >
          {items.map((item) => (
            <SwiperSlide key={`${item.id}-${item.media_type || ''}`}>
              {renderItem ? renderItem(item) : <ContentCard item={item} variant={cardVariant} />}
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}
