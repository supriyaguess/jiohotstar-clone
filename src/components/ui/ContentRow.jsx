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
 * @param {'poster' | 'backdrop'} cardVariant - card type
 * @param {boolean} loading - show skeleton
 */
export default function ContentRow({
  title,
  items = [],
  seeAllLink,
  cardVariant = 'poster',
  loading = false,
}) {
  if (!loading && (!items || items.length === 0)) return null;

  const slidesPerView = cardVariant === 'backdrop'
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
            className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            See All →
          </Link>
        )}
      </div>

      {/* Skeleton */}
      {loading ? (
        <CardSkeleton count={cardVariant === 'backdrop' ? 4 : 7} />
      ) : (
        <Swiper
          modules={[Navigation, A11y]}
          navigation
          spaceBetween={12}
          slidesPerView={slidesPerView.xs}
          breakpoints={{
            475: { slidesPerView: slidesPerView.sm, spaceBetween: 12 },
            640: { slidesPerView: slidesPerView.md, spaceBetween: 16 },
            1024: { slidesPerView: slidesPerView.lg, spaceBetween: 16 },
            1280: { slidesPerView: slidesPerView.xl, spaceBetween: 16 },
          }}
          className="content-row-swiper"
        >
          {items.map((item) => (
            <SwiperSlide key={`${item.id}-${item.media_type || ''}`}>
              <ContentCard item={item} variant={cardVariant} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}
