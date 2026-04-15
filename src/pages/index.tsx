import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/portal",
      permanent: false,
    },
  };
};

export default function HomePage() {
  return null;
}
